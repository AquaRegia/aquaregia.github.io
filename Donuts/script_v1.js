document.addEventListener('DOMContentLoaded', () => {
    const game = document.getElementById('game');
    const size = 6;
    let currentPlayer = 'player1';
    let allowedMoves = new Set();

    // Initialize the board
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

    function handleClick(event) {
        const cell = event.target;
        const index = parseInt(cell.dataset.index);

        // Check if the move is allowed
        if (allowedMoves.size > 0 && !allowedMoves.has(index)) {
            alert('Move not allowed!');
            return;
        }

        // Place the current player's piece
        if (!cell.classList.contains('player1') && !cell.classList.contains('player2')) {
            cell.classList.add(currentPlayer, 'donut');
            updateAllowedMoves(cell);
			cell.classList.remove("horizontal", "vertical", "diagonal1", "diagonal2");
            capturePieces(index);
            if (checkWin(index)) {
                alert(`Player ${currentPlayer === 'player1' ? 1 : 2} wins!`);
                resetGame();
                return;
            }
            currentPlayer = currentPlayer === 'player1' ? 'player2' : 'player1';
        }
    }

    function updateAllowedMoves(cell) {
        allowedMoves.clear();
        const index = parseInt(cell.dataset.index);
        const row = Math.floor(index / size);
        const col = index % size;

        // Clear previous highlights
        for (const cell of game.children) {
            cell.classList.remove('highlight');
        }

        if (cell.classList.contains('horizontal')) {
            for (let i = 0; i < size; i++) {
                allowedMoves.add(row * size + i);
            }
        } else if (cell.classList.contains('vertical')) {
            for (let i = 0; i < size; i++) {
                allowedMoves.add(i * size + col);
            }
        } else if (cell.classList.contains('diagonal1')) {
            for (let i = 0; i < size; i++) {
                if ((row + i < size) && (col + i < size)) {
                    allowedMoves.add((row + i) * size + (col + i));
                }
                if ((row - i >= 0) && (col - i >= 0)) {
                    allowedMoves.add((row - i) * size + (col - i));
                }
            }
        } else if (cell.classList.contains('diagonal2')) {
            for (let i = 0; i < size; i++) {
                if ((row + i < size) && (col - i >= 0)) {
                    allowedMoves.add((row + i) * size + (col - i));
                }
                if ((row - i >= 0) && (col + i < size)) {
                    allowedMoves.add((row - i) * size + (col + i));
                }
            }
        }

		console.log(allowedMoves);

        // Highlight the allowed moves
        for (const idx of allowedMoves) {
            const allowedCell = game.children[idx];
            if (allowedCell && !allowedCell.classList.contains('player1') && !allowedCell.classList.contains('player2')) {
                allowedCell.classList.add('highlight');
            }
			else
			{
				allowedMoves.delete(idx);
			}
        }

        // If no allowed moves, highlight all empty cells and reset allowedMoves
        if (allowedMoves.size === 0) {
            for (const cell of game.children) {
                if (!cell.classList.contains('player1') && !cell.classList.contains('player2')) {
                    cell.classList.add('highlight');
                    allowedMoves.add(parseInt(cell.dataset.index));
                }
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

        directions.forEach(({ dr, dc }) => {
            let count = 1;
            let captured = [];

            for (let i = 1; i < size; i++) {
                const r = Math.floor(index / size) + dr * i;
                const c = index % size + dc * i;
                const idx = r * size + c;
                if (r >= 0 && r < size && c >= 0 && c < size && game.children[idx] && game.children[idx].classList.contains(currentPlayer)) {
                    count++;
                    captured.push(idx);
                } else {
                    break;
                }
            }

            for (let i = 1; i < size; i++) {
                const r = Math.floor(index / size) - dr * i;
                const c = index % size - dc * i;
                const idx = r * size + c;
                if (r >= 0 && r < size && c >= 0 && c < size && game.children[idx] && game.children[idx].classList.contains(currentPlayer)) {
                    count++;
                    captured.push(idx);
                } else {
                    break;
                }
            }

            if (count > 2) {
                captured.forEach(i => {
                    if (!game.children[i].classList.contains(currentPlayer)) {
                        game.children[i].classList.remove('player1', 'player2');
                        game.children[i].classList.add(currentPlayer, 'donut');
                    }
                });
            }
        });
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

            for (let i = 1; i < size; i++) {
                const r = Math.floor(index / size) - dr * i;
                const c = index % size - dc * i;
                const idx = r * size + c;
                if (r >= 0 && r < size && c >= 0 && c < size && game.children[idx] && game.children[idx].classList.contains(currentPlayer)) {
                    count++;
                } else {
                    break;
                }
            }

            if (count >= 5) {
                return true;
            }
        }
        return false;
    }

    function resetGame() {
        for (const cell of game.children) {
            cell.classList.remove('player1', 'player2', 'donut', 'highlight');
        }
        currentPlayer = 'player1';
        allowedMoves.clear();
    }
});
