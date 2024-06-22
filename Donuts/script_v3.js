document.addEventListener('DOMContentLoaded', () => {
    const game = document.getElementById('game');
    const log = document.getElementById('log');
    const size = 6;
	let logCounter = 1;
    let currentPlayer = 'player1';
	let gameOver = false;
    let allowedMoves = new Set();

    // Initialize the board
    initializeBoard();

    function initializeBoard() {
        for (let i = 0; i < size * size; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            game.appendChild(cell);

            // Assign a random background type to each cell
            const backgrounds = ['vertical', 'horizontal', 'diagonal1', 'diagonal2'];
            const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
            cell.classList.add(randomBackground);

            cell.addEventListener('click', handleClick);
        }
    }

    function handleClick(event) {
        const cell = event.target;
        const index = parseInt(cell.dataset.index);

		if (gameOver)
		{
			return;
		}

        // Check if the move is allowed
        if (allowedMoves.size > 0 && !allowedMoves.has(index)) {
            return;
        }

        // Place the current player's piece
        if (!cell.classList.contains('player1') && !cell.classList.contains('player2')) {
            cell.classList.add(currentPlayer, 'donut');
			
			const row = Math.floor(index / size) + 1;
			const col = (index % size) + 1;
			let logMessage = `Player ${currentPlayer === 'player1' ? 1 : 2} placed on ${row}x${col}`;
			
			
            updateAllowedMoves(cell);
            cell.classList.remove("horizontal", "vertical", "diagonal1", "diagonal2");
			cell.classList.add("highlight2");
            const flippedPieces = capturePieces(index);

			if(flippedPieces.length > 0)
			{
				logMessage += " and captured: [";
				let captures = [];
				
				for(let piece of flippedPieces)
				{
					let row = Math.floor(piece / size) + 1;
					let col = (piece % size) + 1;
					captures.push(row + "x" + col);
				}
				
				logMessage += captures.join(", ");
				logMessage += "]";
			}

			addToLog(logMessage);

            if (checkWin(index) || flippedPieces.some(checkWin)) {
				addToLog(`Player ${currentPlayer === 'player1' ? 1 : 2} wins!`); 
                clearHighlights();
				cell.classList.add("highlight2");
				gameOver = true;
                //resetGame();
            }
            currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
        }
    }

    function addToLog(text) {
        const logDiv = document.createElement('div');
        logDiv.textContent = logCounter + ". " + text;
        log.insertBefore(logDiv, log.firstChild);
		logCounter++;
    }

    function updateAllowedMoves(cell) {
        allowedMoves.clear();
        const index = parseInt(cell.dataset.index);
        const row = Math.floor(index / size);
        const col = index % size;

        clearHighlights();

        if (cell.classList.contains('horizontal')) {
            addHorizontalMoves(row);
        } else if (cell.classList.contains('vertical')) {
            addVerticalMoves(col);
        } else if (cell.classList.contains('diagonal1')) {
            addDiagonal1Moves(row, col);
        } else if (cell.classList.contains('diagonal2')) {
            addDiagonal2Moves(row, col);
        }

        highlightAllowedMoves();
    }

    function clearHighlights() {
        for (const cell of game.children) {
            cell.classList.remove('highlight', 'highlight2');
        }
    }

    function addHorizontalMoves(row) {
        for (let i = 0; i < size; i++) {
            allowedMoves.add(row * size + i);
        }
    }

    function addVerticalMoves(col) {
        for (let i = 0; i < size; i++) {
            allowedMoves.add(i * size + col);
        }
    }

    function addDiagonal1Moves(row, col) {
        for (let i = 0; i < size; i++) {
            if ((row + i < size) && (col + i < size)) {
                allowedMoves.add((row + i) * size + (col + i));
            }
            if ((row - i >= 0) && (col - i >= 0)) {
                allowedMoves.add((row - i) * size + (col - i));
            }
        }
    }

    function addDiagonal2Moves(row, col) {
        for (let i = 0; i < size; i++) {
            if ((row + i < size) && (col - i >= 0)) {
                allowedMoves.add((row + i) * size + (col - i));
            }
            if ((row - i >= 0) && (col + i < size)) {
                allowedMoves.add((row - i) * size + (col + i));
            }
        }
    }

    function highlightAllowedMoves() {
        for (const idx of allowedMoves) {
            const allowedCell = game.children[idx];
            if (allowedCell && !allowedCell.classList.contains('player1') && !allowedCell.classList.contains('player2')) {
                allowedCell.classList.add('highlight');
            } else {
                allowedMoves.delete(idx);
            }
        }

        if (allowedMoves.size === 0) {
            highlightAllEmptyCells();
        }
    }

    function highlightAllEmptyCells() {
        for (const cell of game.children) {
            if (!cell.classList.contains('player1') && !cell.classList.contains('player2')) {
                cell.classList.add('highlight');
                allowedMoves.add(parseInt(cell.dataset.index));
            }
        }
    }

    function capturePieces(index) {
        const directions = [
            { dr: 0, dc: 1 }, // horizontal
            { dr: 1, dc: 0 }, // vertical
            { dr: 1, dc: 1 }, // diagonal1
            { dr: 1, dc: -1 } // diagonal2
        ];

        let flippedPieces = [];

        directions.forEach(({ dr, dc }) => {
            flippedPieces = flippedPieces.concat(captureInDirection(index, dr, dc));
        });

        return flippedPieces;
    }

    function captureInDirection(index, dr, dc) {
        const opponent = currentPlayer === 'player1' ? 'player2' : 'player1';

        let positiveSequence = [];
        let negativeSequence = [];
        let flipPieces = false;
        let flipped = [];

        // Scan in the positive direction
        for (let i = 1; i < size; i++) {
            const r = Math.floor(index / size) + dr * i;
            const c = index % size + dc * i;
            const idx = r * size + c;

            if (r < 0 || r >= size || c < 0 || c >= size) {
                break;
            }

            const cell = game.children[idx];

            if (cell && cell.classList.contains(opponent)) {
                positiveSequence.push(idx);
				break;
            }
			else if(!cell || !cell.classList.contains(currentPlayer))
			{
				break;
			}
        }

        // Scan in the negative direction
        for (let i = 1; i < size; i++) {
            const r = Math.floor(index / size) - dr * i;
            const c = index % size - dc * i;
            const idx = r * size + c;

            if (r < 0 || r >= size || c < 0 || c >= size) {
                break;
            }

            const cell = game.children[idx];

            if (cell && cell.classList.contains(opponent)) {
                negativeSequence.push(idx);
				break;
            }
			else if(!cell || !cell.classList.contains(currentPlayer))
			{
				break;
			}
        }

        // If valid sequence found in both directions, flip pieces
        if (positiveSequence.length > 0 && negativeSequence.length > 0) {
            positiveSequence.forEach(idx => {
                game.children[idx].classList.remove(opponent);
                game.children[idx].classList.add(currentPlayer);
                flipped.push(idx);
            });
            negativeSequence.forEach(idx => {
                game.children[idx].classList.remove(opponent);
                game.children[idx].classList.add(currentPlayer);
                flipped.push(idx);
            });
        }

        return flipped;
    }

    function checkWin(index) {
        const directions = [
            { dr: 0, dc: 1 }, // horizontal
            { dr: 1, dc: 0 }, // vertical
            { dr: 1, dc: 1 }, // diagonal1
            { dr: 1, dc: -1 } // diagonal2
        ];

        for (const { dr, dc } of directions) {
            let count = 1;
            count += countInDirection(index, dr, dc);
            count += countInDirection(index, -dr, -dc);

            if (count >= 5) {
                return true;
            }
        }
        return false;
    }

    function countInDirection(index, dr, dc) {
        let count = 0;
        for (let i = 1; i < size; i++) {
            const r = Math.floor(index / size) + dr * i;
            const c = index % size + dc * i;
            const idx = r * size + c;
            if (r >= 0 && r < size && c >= 0 && c < size && game.children[idx] && game.children[idx].classList.contains(currentPlayer)) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    function resetGame() {
        game.innerHTML = "";
        log.innerHTML = "";
        initializeBoard();
        currentPlayer = 'player1';
        allowedMoves.clear();
		gameOver = false;
    }
});
