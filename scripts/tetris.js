/*
TODO:
- [x] separate index/game pages
- [ ] set up game "level", which increases speed of falling tetrads
- [ ] offline support (https://diveinto.html5doctor.com/offline.html)
- [ ] swipe controls for mobile
*/

const EMPTY = null;
const DROPPED = 0;
const DEFAULT_SPEED = 500;
const FAST_SPEED = 50;

class Game extends Grid {
    cssClassMap = {
        0: 'grey',
        1: 'red',
        2: 'blue',
        3: 'yellow',
        4: 'green',
        5: 'purple',
        6: 'orange',
        null: ''
    }

    constructor() {
        let rows = 20;
        let columns = 10;

        super(rows, columns);

        let nextDisplayState = this.displayStateCopy();
        this.fill(nextDisplayState, EMPTY);

        // get query params to determine "height" garbage
        const urlParams = new URLSearchParams(window.location.search);
        const height = parseInt(urlParams.get('height'), 10);

        if (height > 0) {
            // randomly fill the bottom "x" rows with garbage
            for (let y = this.rows - 1; y > this.rows - height - 1; y -= 1) {
                for (let x = 0; x < this.columns - 1; x += 1) {
                    nextDisplayState[x][y] = Math.random() > 0.5 ? DROPPED : EMPTY;
                }
            }
        }

        // create/fill queue for upcoming pieces
        // NOTE: could eventually display upcoming pieces
        this.pieceQueue = [];
        this.fillPieceQueue();

        // create initial piece
        this.movingPiece = this.createPiece(nextDisplayState);

        this.render(nextDisplayState);

        this.score = 0;
        this.lines = 0;

        // bind global keyboard handlers
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));

        // experiment with touch control
        window.addEventListener('touchstart', this.onTouchStart.bind(this));
        window.addEventListener('touchend', this.onTouchEnd.bind(this));

        // update loop
        this.interval = setInterval(this.update.bind(this), 50);
        this.previousTime = performance.now();
        this.updateSpeedInMs = DEFAULT_SPEED;
    }

    ArrowLeft() {
        this.move(-1);
    }

    ArrowRight() {
        this.move(1);
    }

    ArrowUp() {
        this.rotate(1);
    }

    x() {
        this.rotate(-1);
    }

    z() {
        this.rotate(1);
    }

    ArrowDown() {
        // Allow the game to update faster if the player holds the "down" key
        this.updateSpeedInMs = FAST_SPEED;
    }

    onKeyDown(event) {
        // If the `Game` component has a defined method that
        // is equal to the name of the pressed key...
        if (typeof this[event.key] === 'function') {
            event.preventDefault();

            // fire that method
            this[event.key]();
        }
    }

    // The only purpose of this handler is to slow piece speed
    onKeyUp(event) {
        if (event.key === 'ArrowDown') {
            event.preventDefault()

            this.updateSpeedInMs = DEFAULT_SPEED;
        }
    }

    onTouchStart(event) {
        // store where the player first touched the screen
        this.currentTouch = event.changedTouches[0];  // only care about the first touch
    }

    onTouchEnd(event) {
        // store local ref to last touch
        const endTouch = event.changedTouches[0];

        let xDiff = endTouch.clientX - this.currentTouch.clientX;
        let yDiff = endTouch.clientY - this.currentTouch.clientY;

        // if player just tapped without swiping a direction
        if (Math.abs(xDiff) + Math.abs(yDiff) < 10) {
            this.ArrowUp();

        // player moved their finger horizontally more than vertically
        } else if (Math.abs(xDiff) > Math.abs(yDiff)) {
            // user moved their finger (mostly) right
            if (xDiff > 0) {
                this.ArrowRight();
            } else {
                this.ArrowLeft();
            }
        // user moved their finger (mostly) down
        } else if (yDiff > 0) {
            // drop tetrad instantly
            while (this.fall()) {}
        }
    }

    rotate(direction) {
        let newDisplayState = this.displayStateCopy();

        // store new positions of block
        let newPositions = this.calcRotate(direction);

        // if piece rotates "out of bounds", move it back in
        // use the accumulator to store the value to "push" the x value of each position
        let offset = newPositions.reduce((accumulator, position) => {
            const maxWidth = this.columns - 1;

            if (position.x < 0 && position.x < accumulator) {
                return position.x;
            }

            if (position.x > maxWidth && (position.x - maxWidth) > accumulator) {
                return position.x - maxWidth;
            }

            return accumulator;
        }, 0); // offset's initial value is 0

        if (offset !== 0) {
            newPositions = newPositions.map(({ x, y }) => {
                return { x: x - offset, y: y };
            })
        }

        // delete old positions
        this.movingPiece.position.forEach(({ x: x, y: y }) => { newDisplayState[x][y] = EMPTY; });

        // check validity of new position
        for (let i = 0; i < 4; i += 1) {
            const newPosition = newPositions[i];

            // don't allow moving into any occupied spaces
            if (newDisplayState[newPosition.x][newPosition.y] !== EMPTY) {
                console.log(`canceling rotation; trying to move in an occupied space`);
                // TODO: revert the rotation angle on the moving piece
                return;
            }
        }

        // if we've made it here, it means the new move is valid

        // put new blocks in place
        newPositions.forEach(({ x: x, y: y }) => { newDisplayState[x][y] = this.movingPiece.color; })

        // save references to the new indexes of the piece
        this.movingPiece.position = newPositions;

        // update state; called here rather than waiting for `update()` so that rotation is instantaneous
        this.render(newDisplayState)
    }

    // @return Array of points representing the position of a tetrad
    calcRotate(direction) {
        // TODO: refactor this garbage
        this.movingPiece.rotation += 90 * direction;
        if (this.movingPiece.rotation === 360) {
            this.movingPiece.rotation = 0;
        }

        if (this.movingPiece.rotation === -90) {
            this.movingPiece.rotation = 270;
        }

        let center = this.movingPiece.position[0];

        switch (this.movingPiece.type) {
            case 'T':
                if (this.movingPiece.rotation === 0) {
                    // *[*]*
                    //   *
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x + 1, y: center.y },
                        { x: center.x, y: center.y + 1 },
                    ];
                } else if (this.movingPiece.rotation === 90) {
                    //   *
                    // *[*]
                    //   *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x - 1, y: center.y },
                        { x: center.x, y: center.y + 1 },
                    ];
                } else if (this.movingPiece.rotation === 180) {
                    //   *
                    // *[*]*
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x, y: center.y - 1 },
                        { x: center.x + 1, y: center.y },
                    ];
                } else if (this.movingPiece.rotation === 270) {
                    //   *
                    //  [*]*
                    //   *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x + 1, y: center.y },
                        { x: center.x, y: center.y + 1 },
                    ];
                }
                break;

            case 'O':
                // no-op
                return [
                    center,
                    { x: center.x, y: center.y + 1 },
                    { x: center.x + 1, y: center.y },
                    { x: center.x + 1, y: center.y + 1 },
                ];
                break;
            case 'S':
                // this condition matches 0 and 180
                if (this.movingPiece.rotation % 180 === 0) {
                    //  [*]*
                    // * *
                    return [
                        center,
                        { x: center.x + 1, y: center.y },
                        { x: center.x, y: center.y + 1 },
                        { x: center.x - 1, y: center.y + 1 },
                    ];
                } else {
                    //  *
                    // [*]*
                    //   *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x + 1, y: center.y },
                        { x: center.x + 1, y: center.y + 1 },
                    ];
                }
                break;
            case 'Z':
                // this condition matches 0 and 180
                if (this.movingPiece.rotation % 180 === 0) {
                    // *[*]
                    //   * *
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x, y: center.y + 1 },
                        { x: center.x + 1, y: center.y + 1 },
                    ];
                } else {
                    //   *
                    // *[*]
                    // *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x - 1, y: center.y },
                        { x: center.x - 1, y: center.y + 1 },
                    ];
                }
                break;
            case 'L':
                if (this.movingPiece.rotation === 0) {
                    // *[*]*
                    // *
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x - 1, y: center.y + 1 },
                        { x: center.x + 1, y: center.y },
                    ];
                } else if (this.movingPiece.rotation === 90) {
                    // * *
                    //  [*]
                    //   *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x - 1, y: center.y - 1 },
                        { x: center.x, y: center.y + 1 },
                    ];
                } else if (this.movingPiece.rotation === 180) {
                    //     *
                    // *[*]*
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x + 1, y: center.y },
                        { x: center.x + 1, y: center.y - 1 },
                    ];
                } else {
                    // *
                    //[*]
                    // * *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x, y: center.y + 1 },
                        { x: center.x + 1, y: center.y + 1 },
                    ];
                }
                break;
            case 'J':
                if (this.movingPiece.rotation === 0) {
                    // *[*]*
                    //     *
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x + 1, y: center.y },
                        { x: center.x + 1, y: center.y + 1 },
                    ];
                } else if (this.movingPiece.rotation === 90) {
                    //   *
                    //  [*]
                    // * *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x, y: center.y + 1 },
                        { x: center.x - 1, y: center.y + 1 },
                    ];
                } else if (this.movingPiece.rotation === 180) {
                    // *
                    // *[*]*
                    return [
                        center,
                        { x: center.x - 1, y: center.y - 1 },
                        { x: center.x - 1, y: center.y },
                        { x: center.x + 1, y: center.y },
                    ];
                } else {
                    //  * *
                    // [*]
                    //  *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x + 1, y: center.y - 1 },
                        { x: center.x, y: center.y + 1 },
                    ];
                }
                break;
            case 'I':
                if (this.movingPiece.rotation % 180 === 0) {
                    // *[*]* *
                    return [
                        center,
                        { x: center.x - 1, y: center.y },
                        { x: center.x + 1, y: center.y },
                        { x: center.x + 2, y: center.y },
                    ];
                } else {
                    //  *
                    // [*]
                    //  *
                    //  *
                    return [
                        center,
                        { x: center.x, y: center.y - 1 },
                        { x: center.x, y: center.y + 1 },
                        { x: center.x, y: center.y + 2 },
                    ];
                }
                break;
        }
    }

    // direction is 1 or -1
    move(direction) {
        let newDisplayState = this.displayStateCopy();

        // store new positions of block
        const newPositions = this.movingPiece.position.map(({ x, y }) => {
            return { x: x + direction, y: y };
        });

        // delete old positions
        this.movingPiece.position.forEach(({ x, y }) => newDisplayState[x][y] = EMPTY)

        // check validity of new position
        for (let i = 0; i < 4; i += 1) {
            const currentPoint = this.movingPiece.position[i];
            const newPosition = newPositions[i];

            // don't allow movement past the edge of the screen
            if (newPosition.x < 0 || newPosition.x >= this.columns) {
                return;
            }

            // don't allow moving into any occupied spaces
            if (newDisplayState[newPosition.x][newPosition.y] !== EMPTY) {
                return;
            }
        }

        // if we've made it here, it means the new move is valid

        // put new blocks in place
        newPositions.forEach(({ x, y }) => newDisplayState[x][y] = this.movingPiece.color);

        // save references to the new indexes of the piece
        this.movingPiece.position = newPositions;

        // update state; called here rather than waiting for `update()` so that movement is instantaneous
        this.render(newDisplayState);
    }

    fillPieceQueue() {
        const shapes = ['O', 'S', 'Z', 'T', 'L', 'J', 'I'];

        while (this.pieceQueue.length < 5) {
            const type = shapes[Math.floor(Math.random() * shapes.length)]
            const color = Math.floor(Math.random() * 6) + 1;

            this.pieceQueue.push({type, color})
        }
    }

    // given a specific index to center the piece around,
    // populate `this.cells` with a tetrad, and return the
    // indices of the piece blocks
    createPiece(cells) {
        // Place the new piece at the top of the screen, in the middle of the grid
        const centerPoint = {
            x: Math.floor(this.columns / 2),
            y: 0
        };

        // pop a piece off the next queue
        const piece = this.pieceQueue.shift();

        // refill the queue
        this.fillPieceQueue();

        // TODO: `calcRotate` inspects state of the piece;
        // change to accept args instead
        this.movingPiece = {
            rotation: 270,
            position: [centerPoint],
            type: piece.type
        };

        let shapePoints = this.calcRotate(1);

        // `cantPlace` means that there's garbage where the piece should
        // spawn, and basically you lose the game
        let cantPlace = false;

        shapePoints.forEach(({ x: x, y: y }) => {
            if (cells[x][y] !== EMPTY) {
                cantPlace = true;
            }

            cells[x][y] = piece.color;
        });

        if (cantPlace) {
            return false;
        }

        return {
            position: shapePoints,
            type: piece.type,
            rotation: 0,
            color: piece.color
        };
    }

    // remove any row that is full of stopped blocks
    // basically go through each row, and if every column cell is "filled"
    // then the `clear` var remains true, which then triggers the clear at
    // the end of the loop
    clearRows(cells) {
        // used for a scoring multiplier
        let clearCount = 0;

        for (let y = 0; y < this.rows; y += 1) {
            // innocent until proven guilty
            let clear = true;

            for (let x = 0; x < this.columns; x += 1) {
                // if any cell in the row is empty, there's no line to clear
                // move on to the next row
                if (cells[x][y] === EMPTY) {
                    clear = false;
                    break;
                }
            }

            if (clear === true) {
                clearCount += 1;

                // Remove the filled line, and "push" the entire grid downwards
                for (let x = 0; x < this.columns; x += 1) {
                    cells[x].splice(y, 1);
                    cells[x].unshift(EMPTY);
                }
            }
        }

        this.lines += clearCount;

        switch (clearCount) {
            case 1:
                this.score += 100;
                break;
            case 2:
                this.score += 300;
                break;
            case 3:
                this.score += 500;
                break;
            case 4:
                this.score += 800;
                break;
            default:
                // no points for u!
                break;
        }

        document.querySelector('#score').textContent = `Score: ${this.score}`;
        document.querySelector('#lines').textContent = `Lines: ${this.lines}`;
    }

    fall() {
        const nextDisplayState = this.displayStateCopy();

        // store new positions of moving block
        const newPositions = this.movingPiece.position.map(({x, y}) => {
            return { x, y: y + 1 };
        });

        // delete old positions
        this.movingPiece.position.forEach(({ x, y }) => nextDisplayState[x][y] = EMPTY);

        // check validity of all new positions
        for (let i = 0; i < 4; i += 1) {
            let {x, y} = newPositions[i];

            // if block would fall off the bottom, _or_ would move down into a non-empty square,
            // it can't be moved further
            if (y >= this.rows || nextDisplayState[x][y] !== EMPTY) {
                // return the block to its original place
                this.movingPiece.position.forEach(({ x, y }) => nextDisplayState[x][y] = this.movingPiece.color);

                return false;
            }
        }

        // put blocks in place in new position
        newPositions.forEach(({ x, y }) => { nextDisplayState[x][y] = this.movingPiece.color; })

        // save references to the new position of the piece
        this.movingPiece.position = newPositions;

        // update the UI
        this.render(nextDisplayState);

        return true;
    }

    update() {
        const now = performance.now();

        if (now - this.previousTime < this.updateSpeedInMs) {
            return;
        }

        this.previousTime = now;

        if (this.fall() === false) {
            const nextDisplayState = this.displayStateCopy();

            // mark all pieces of the moving block as "dropped"
            this.movingPiece.position.forEach(({ x: x, y: y }) => nextDisplayState[x][y] = DROPPED);

            // TODO: cells (passed by reference) is mutated
            this.clearRows(nextDisplayState);

            // TODO: cells (passed by reference) is mutated
            this.movingPiece = this.createPiece(nextDisplayState);

            // NOTE: `createPiece` will still fill in squares in the grid, but won't return a reference to them
            // if they overlap with another block

            // if piece can't be placed, game over!
            if (this.movingPiece === false) {
                this.gameOver();
            }

            this.render(nextDisplayState);
        }
    }

    gameOver() {
        clearInterval(this.interval);

        // display "game over" text
        document.querySelector('#game_over').style = 'display: block;';

        document.querySelector('#back').addEventListener('click', e => {
            window.location = 'index.html';
        });

        // TODO: "brick up" the game area
    }
};
