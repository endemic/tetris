/* 
TODO: 
 
- [ ] display score
- [ ] show upcoming piece
- [ ] offline support (https://diveinto.html5doctor.com/offline.html)
- [x] make down arrow instantly drop piece, but allow for quick movement
      before the piece locks in place
- [ ] allow pieces to "bump" themselves away from sides when rotating
  * (? does GB tetris do this?)
- [ ] determine canonical # of rows/cols (steal from GB - 10 rows, 18 cols/NES tetris - 10 rows, 20 cols)
- [ ] Make bg image
- [ ] buttons for left/right/down/rotate on mobile? or tap controls?
*/

const EMPTY = null;

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

        // create initial piece
        this.movingPiece = this.createPiece(nextDisplayState);

        this.render(nextDisplayState);

        this.score = 0;

        // bind global keyboard handlers
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));

        // experiment with touch control
        window.addEventListener('touchstart', this.onTouchStart.bind(this));
        window.addEventListener('touchend', this.onTouchEnd.bind(this));

        // update loop
        this.interval = setInterval(this.update.bind(this), 100);
        this.previousTime = performance.now();
        this.updateSpeedInMs = 500;
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

    ArrowDown() {
        // Allow the game to update faster if the player holds the "down" key
        // TODO: extract this magic number
        this.updateSpeedInMs = 75;
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

            // TODO: extract this magic number
            this.updateSpeedInMs = 500;
        }
    }

    onTouchStart(event) {
        event.preventDefault();

        // store where the player first touched the screen
        this.currentTouch = event.changedTouches[0];  // only care about the first touch

        const clicked = {
            x: parseInt(event.target.dataset.x, 10),
            y: parseInt(event.target.dataset.y, 10)
        };

        const center = this.movingPiece.position[0];


        // if touching the moving piece, then rotate
        if (Math.abs(clicked.x - center.x) < 2 && Math.abs(clicked.y - center.y) < 2) {
            this.rotate(1);
        } else if (clicked.x < center.x) {
            // if touching to the left, move to the left
            this.ArrowLeft();
        } else if (clicked.x > center.x) {
            // if touching to the right, move to the right
            this.ArrowRight()
        }
    }

    onTouchEnd(event) {
        event.preventDefault();

        // store local ref to last touch
        const endTouch = e.changedTouches[0];

        let xDiff = endTouch.clientX - this.currentTouch.clientX;
        let yDiff = endTouch.clientY - this.currentTouch.clientY;

        // if 
    }

    rotate(direction) {
        let newDisplayState = this.displayStateCopy();

        // store new positions of block
        const newPositions = this.calcRotate(direction);

        // delete old positions
        this.movingPiece.position.forEach(({ x: x, y: y }) => { newDisplayState[x][y] = EMPTY; });

        // check validity of new position
        for (let i = 0; i < 4; i += 1) {
            const currentPoint = this.movingPiece.position[i];
            const newPosition = newPositions[i];

            // don't allow any blocks to move past the edge of the grid
            // TODO: allow blocks to "push" themselves away from edges when rotating
            if (newPosition.x < 0 || newPosition.x >= this.columns) {
                return;
            }

            // don't allow moving into any occupied spaces
            if (newDisplayState[newPosition.x][newPosition.y] !== EMPTY) {
                console.log(`canceling rotation; trying to move in an occupied space`);
                return;
            }
        }

        // if we've made it here, it means the new move is valid

        // put new blocks in place
        newPositions.forEach(({ x: x, y: y }) => { newDisplayState[x][y] = this.movingPiece.color; })

        // save references to the new indexes of the piece
        this.movingPiece.position = newPositions;

        this.render(newDisplayState)
    }

    // @return Array of points representing the position of a tetrad
    calcRotate(direction) {

        // TODO: refactor this garbage
        this.movingPiece.rotation += 90 * direction;
        if (this.movingPiece.rotation === 360) {
            this.movingPiece.rotation = 0;
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

        // update state
        this.render(newDisplayState);
    }

    ' '() {
        // console.log('lol space');

        // DEBUG
        this.dumpState()
    }

    dumpState() {
        for (let row = 0; row < this.rowCount; row += 1) {
            console.log(this.state.cells.slice(row * this.columnCount, row * this.columnCount + this.columnCount))
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

        const shapes = ['O', 'S', 'Z', 'T', 'L', 'J', 'I'];

        let shapeType = shapes[Math.floor(Math.random() * shapes.length)]

        let color = Math.floor(Math.random() * 6) + 1;

        // TODO: `calcRotate` inspects state of the piece;
        // change to accept args instead
        this.movingPiece = {
            rotation: 270,
            position: [centerPoint],
            type: shapeType
        };

        let shapePoints = this.calcRotate(1);

        // `cantPlace` means that there's garbage where the piece should
        // spawn, and basically you lose the game
        let cantPlace = false;

        shapePoints.forEach(({ x: x, y: y }) => {
            if (cells[x][y] !== EMPTY) {
                cantPlace = true;
            }

            cells[x][y] = color;
        });

        if (cantPlace) {
            return false;
        }

        return {
            position: shapePoints,
            type: shapeType,
            rotation: 0,
            color: color
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
                console.log(`line ${y} cleared!`);

                // Remove the filled line, and "push" the entire grid downwards
                for (let x = 0; x < this.columns; x += 1) {
                    cells[x].splice(y, 1);
                    cells[x].unshift(EMPTY);
                }
            }
        }

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

        console.log(`Score: ${this.score}`);
    }

    update() {
        const now = performance.now();

        if (now - this.previousTime < this.updateSpeedInMs) {
            return;
        }

        this.previousTime = now;

        const nextDisplayState = this.displayStateCopy();

        // store new positions of moving block
        const newPositions = this.movingPiece.position.map(point => {
            return { x: point.x, y: point.y + 1 }
        });

        // delete old positions
        this.movingPiece.position.forEach(({ x: x, y: y }) => nextDisplayState[x][y] = null)

        // check validity of all new positions
        for (let i = 0; i < 4; i += 1) {
            let point = newPositions[i];
            // if block would move off the bottom, or would move DOWN into a non-empty square...
            if (point.y >= this.rows || nextDisplayState[point.x][point.y] !== null) {
                // mark all pieces of the moving block as "stopped"
                this.movingPiece.position.forEach(({ x: x, y: y }) => nextDisplayState[x][y] = 0);

                // TODO: cells (passed by reference) is mutated
                this.clearRows(nextDisplayState);

                // TODO: cells (passed by reference) is mutated
                this.movingPiece = this.createPiece(nextDisplayState);

                this.render(nextDisplayState);

                // if piece can't be placed, game over!
                if (this.movingPiece === false) {
                    this.gameOver();
                }

                return;
            }
        }

        // put blocks in place in new position
        newPositions.forEach(({ x: x, y: y }) => { nextDisplayState[x][y] = this.movingPiece.color; })

        // save references to the new position of the piece
        this.movingPiece.position = newPositions;

        // update state
        this.render(nextDisplayState)
    }

    gameOver() {
        clearInterval(this.interval);
        console.log('u lose!');
    }
};
