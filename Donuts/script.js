document.addEventListener('DOMContentLoaded', () =>
{
	let database = firebase.database();
	
	const game = document.getElementById('game');
	const log = document.getElementById('log');
	const size = 6;
	let gameObject;
	let playerObjects = {};
	let allowedMoves = new Set();
	let userID;
	let gameID;
	let localLog = [];

	firebase.auth().onAuthStateChanged(function(user) {
		if (user) {
			console.log("Logged in with user:", user.uid);
			userID = user.uid;
			
			database.ref("users/" + userID).once("value", snapshot => 
			{
				let user = snapshot.val();
				
				if(user)
				{
					document.querySelector("#username").value = user.name;
				}
			});
			
		} else {
			console.log("Creating new user");
			firebase.auth().signInAnonymously().catch(function(error)
			{
                var errorCode = error.code;
                var errorMessage = error.message;
                console.error("Error signing in anonymously:", errorCode, errorMessage);
            });
		}
	});

	document.querySelector("#namePicker").classList.remove("hidden");

	document.querySelector("#hostButton").addEventListener("click", e => 
	{
		if(!enteredName())
		{
			return;
		}
		
		document.querySelector("#namePicker").classList.add("hidden");
		
		initializeBoard();
		
		gameID = generateUUID();
		gameObject = {
			players: {
				[userID]: 
				{
					index: 0,
					name: document.querySelector("#username").value,
					ID: userID
				}
			},
			settings: {
				maxPlayers: 2
			},
			state: {
				boardClasses: getBoardClasses(),
				gameOver: false, 
				playerIndexTurn: 0,
				latestAction: new Date().getTime(),
				latestLog: [`${document.querySelector("#username").value} created a game.`]
			}
		};
		
		logObject = `${document.querySelector("#username").value} created a game.`;
		
		database.ref('games/' + gameID).set(gameObject);
		database.ref('gameLogs/' + gameID).push(logObject);

		joinGame(gameID);
	});

	document.querySelector("#joinButton").addEventListener("click", e => 
	{
		if(!enteredName())
		{
			return;
		}
		
		document.querySelector("#namePicker").classList.add("hidden");
		
		let gameList = document.querySelector("#gameList");

		database.ref("games").orderByChild("state/latestAction").once("value", snapshot =>
		{
			games = snapshot.val();
			
			if(games)
			{
				gameList.innerHTML = "";
				let currentTime = new Date().getTime();
				let gamesToDelete = [];
				
				for(let g of Object.entries(games))
				{
					if(g[1].state.gameOver)
					{
						if(currentTime - g[1].state.latestAction > 120000)
						{
							gamesToDelete.push(g[0]);
						}
						
						continue;
					}
					else if(g[1].settings.maxPlayers == Object.keys(g[1].players).length)
					{
						if(currentTime - g[1].state.latestAction > 86400000)
						{
							gamesToDelete.push(g[0]);
							continue;
						}
						
						if(!Object.keys(g[1].players).includes(userID))
						{
							continue;
						}
					}
					else if(currentTime - g[1].state.latestAction > 600000)
					{
						if(currentTime - g[1].state.latestAction > 660000)
						{
							gamesToDelete.push(g[0]);
						}
						
						continue;
					}
					
					let div = document.createElement("div");
					div.classList.add("button");
					div.innerHTML = Object.values(g[1].players).map(e => e.name).join(" VS. ");

					if(Object.keys(g[1].players).includes(userID))
					{
						div.classList.add("importantText");
					}

					div.addEventListener("click", e => 
					{
						initializeBoard();
						joinGame(g[0]);
						gameList.classList.add("hidden");
					});
					
					gameList.appendChild(div);
				}
				
				for(let id of gamesToDelete)
				{
					database.ref("games/" + id).remove();
					database.ref("gameLogs/" + id).remove();
				}
			}
			
			gameList.classList.remove("hidden");
		});
	});

	document.querySelector("#resetButton").addEventListener("click", resetGame);

	function enteredName()
	{
		if(document.querySelector("#username").reportValidity())
		{
			database.ref('users/' + userID).update(
			{
				name: document.querySelector("#username").value, 
				latestAction: new Date().getTime()
			});
		
			return true;
		}
		else
		{
			return false;
		}
	}

	function joinGame(id)
	{
		gameID = id;
		let username = document.querySelector("#username").value;
		
		database.ref("games/" + id + "/state/latestLog").on("value", snapshot => 
		{
			localLog.push(snapshot.val());
		});
		
		database.ref("gameLogs/" + id).once("value", snapshot => 
		{
			localLog = Object.values(snapshot.val());
		});

		database.ref("games/" + id).once("value", snapshot =>
		{
			gameObject = snapshot.val();
			
			if(!isGameFull())
			{
				if(!Object.keys(gameObject.players).includes(userID))
				{
					gameObject.players[userID] = {
						...gameObject.players[userID], 
						index: Object.keys(gameObject.players).length,
						ID: userID
					};
				}
				
				gameObject.players[userID] = {
					...gameObject.players[userID], 
					name: username, 
				};
			}
			
			database.ref('games/' + gameID + "/players").set(gameObject.players);

			database.ref("games/" + id + "/state").update(
			{
				latestLog: username + " joined the game."
			});
			database.ref("gameLogs/" + id).push(username + " joined the game.");
		});

		database.ref("games/" + id).on("value", snapshot =>
		{
			if(!snapshot.val())
			{
				game.innerHTML = "";
				log.innerHTML = "";
				
				document.querySelector("#resetButton").classList.add("hidden");
				document.querySelector("#gameHeader").classList.add("hidden");
				document.querySelector("#game").classList.add("hidden");
				document.querySelector("#logFieldset").classList.add("hidden");
				
				document.querySelector("#namePicker").classList.remove("hidden");
				return;
			}
			
			gameObject = snapshot.val();
			
			document.querySelector("#gameHeader").classList.remove("hidden");
			document.querySelector("#gameHeader").innerHTML = "";
			
			if(!gameObject.state.gameOver && !document.querySelector("#resetButton").classList.contains("hidden"))
			{
				localLog = [gameObject.state.latestLog];
			}
			
			document.querySelector("#resetButton").classList.add("hidden");
			
			for(let p of Object.values(gameObject.players))
			{
				document.querySelector("#gameHeader").innerHTML += `<div class='p${p.index + 1} thumbnail'></div> ${p.name}<br/>`;
			}

			setBoardClasses(gameObject.state.boardClasses);
			updateLog();
			
			if(gameObject.state.gameOver && Object.keys(gameObject.players).includes(userID))
			{
				document.querySelector("#resetButton").classList.remove("hidden");
			}
			
			document.querySelector("#game").classList.remove("hidden");
			document.querySelector("#logFieldset").classList.remove("hidden");
		});
	}

	function generateUUID()
	{
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c)
		{
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	function getBoardClasses()
	{
		return Array.from(document.querySelector("#game").children).map(e => e.classList);
	}
	
	function setBoardClasses(classArray)
	{
		let cells = document.querySelector("#game").children;
		
		for(let i = 0; i < classArray.length; i++)
		{
			cells[i].classList.remove(...cells[i].classList);
			cells[i].classList.add(...classArray[i]);
		}
	}

	function initializeBoard()
	{
		for (let i = 0; i < size * size; i++)
		{
			const cell = document.createElement('div');
			cell.classList.add('c', "h1");
			cell.dataset.index = i;
			game.appendChild(cell);

			// Assign a random background type to each cell
			const backgrounds = ['v', 'h', 'd1', 'd2'];
			const randomBackground = backgrounds[Math.floor(Math.random() * backgrounds.length)];
			cell.classList.add(randomBackground);

			cell.addEventListener('click', handleClick);
		}
	}
	
	function getPlayerByID(id)
	{
		for(let [k, p] of Object.entries(gameObject.players))
		{
			if(k == id)
			{
				return p;
			}
		}
		
		return null;
	}
	
	function getCurrentPlayer()
	{
		for(let p of Object.values(gameObject.players))
		{
			if(p.index == gameObject.state.playerIndexTurn)
			{
				return p;
			}
		}
		
		return null;
	}
	
	function isGameFull()
	{
		return gameObject.settings.maxPlayers == Object.keys(gameObject.players).length;
	}
	
	function handleClick(event)
	{
		const cell = event.target;
		const index = parseInt(cell.dataset.index);

		if (gameObject.state.gameOver || getCurrentPlayer().ID != userID || !isGameFull())
		{
			return;
		}

		// Check if the move is allowed
		if (!cell.classList.contains("h1"))
		{
			return;
		}

		// Place the current player's piece
		if (!cell.classList.contains('f'))
		{
			const row = Math.floor(index / size) + 1;
			const col = (index % size) + 1;

			let currentPlayer = getCurrentPlayer();

			let logMessage = `${currentPlayer.name} placed on ${row}x${col}`;

			cell.classList.add("f", "p" + (currentPlayer.index + 1));
			
			updateAllowedMoves(cell);
			
			cell.classList.remove("h", "v", "d1", "d2");
			cell.classList.add("h2");

			const flippedPieces = capturePieces(index);

			if (flippedPieces.length > 0)
			{
				logMessage += ", and captured: [";
				let captures = [];

				for (let piece of flippedPieces)
				{
					let row = Math.floor(piece / size) + 1;
					let col = (piece % size) + 1;
					captures.push(row + "x" + col);
				}
				
				logMessage += captures.join(", ");
				logMessage += "]";
			}

			if (checkWin(index) || flippedPieces.some(checkWin))
			{
				logMessage += `. ${currentPlayer.name} wins!`;
				clearHighlights();
				cell.classList.add("h2");
				gameObject.state.gameOver = true;
			}
			else if(document.querySelectorAll(".c").length == document.querySelectorAll(".f").length)
			{
				logMessage += `. It's a tie!`;
				clearHighlights();
				cell.classList.add("h2");
				gameObject.state.gameOver = true;
			}
			else
			{
				gameObject.state.playerIndexTurn = (gameObject.state.playerIndexTurn + 1) % gameObject.settings.maxPlayers;
			}

			gameObject.state.latestLog = logMessage;

			sendGameInformation();
		}
	}

	function sendGameInformation()
	{
		gameObject.state.boardClasses = getBoardClasses();
		gameObject.state.latestAction = new Date().getTime();
		
		console.log("Sending", JSON.stringify(gameObject).length, "bytes");
		
		database.ref("games/").update(
		{
			[gameID]: gameObject
		});
		
		database.ref("gameLogs/" + gameID).push(gameObject.state.latestLog);
	}

	function updateLog()
	{
		log.innerHTML = "";
		let logContent = localLog;
		
		for(let i = logContent.length - 1; i >= 0; i--)
		{
			const logDiv = document.createElement('div');
			logDiv.textContent = (i+1) + ". " + logContent[i];
			log.appendChild(logDiv);
		}
	}

	function updateAllowedMoves(cell)
	{
		allowedMoves.clear();
		const index = Array.prototype.indexOf.call(cell.parentNode.children, cell);
		const row = Math.floor(index / size);
		const col = index % size;

		clearHighlights();

		if (cell.classList.contains('h'))
		{
			addHorizontalMoves(row);
		}
		else if (cell.classList.contains('v'))
		{
			addVerticalMoves(col);
		}
		else if (cell.classList.contains('d1'))
		{
			addDiagonal1Moves(row, col);
		}
		else if (cell.classList.contains('d2'))
		{
			addDiagonal2Moves(row, col);
		}

		highlightAllowedMoves();
	}

	function clearHighlights()
	{
		for (const cell of game.children)
		{
			cell.classList.remove('h1', 'h2');
		}
	}

	function addHorizontalMoves(row)
	{
		for (let i = 0; i < size; i++)
		{
			allowedMoves.add(row * size + i);
		}
	}

	function addVerticalMoves(col)
	{
		for (let i = 0; i < size; i++)
		{
			allowedMoves.add(i * size + col);
		}
	}

	function addDiagonal1Moves(row, col)
	{
		for (let i = 0; i < size; i++)
		{
			if ((row + i < size) && (col + i < size))
			{
				allowedMoves.add((row + i) * size + (col + i));
			}
			if ((row - i >= 0) && (col - i >= 0))
			{
				allowedMoves.add((row - i) * size + (col - i));
			}
		}
	}

	function addDiagonal2Moves(row, col)
	{
		for (let i = 0; i < size; i++)
		{
			if ((row + i < size) && (col - i >= 0))
			{
				allowedMoves.add((row + i) * size + (col - i));
			}
			if ((row - i >= 0) && (col + i < size))
			{
				allowedMoves.add((row - i) * size + (col + i));
			}
		}
	}

	function highlightAllowedMoves()
	{
		for (const idx of allowedMoves)
		{
			const allowedCell = game.children[idx];
			if (allowedCell && !allowedCell.classList.contains('f'))
			{
				allowedCell.classList.add('h1');
			}
			else
			{
				allowedMoves.delete(idx);
			}
		}

		if (allowedMoves.size === 0)
		{
			highlightAllEmptyCells();
		}
	}

	function highlightAllEmptyCells()
	{
		for (const cell of game.children)
		{
			if (!cell.classList.contains('f'))
			{
				cell.classList.add('h1');
				allowedMoves.add(parseInt(cell.dataset.index));
			}
		}
	}

	function capturePieces(index)
	{
		const directions = [
			{
				dr: 0,
				dc: 1
			}, // horizontal
			{
				dr: 1,
				dc: 0
			}, // vertical
			{
				dr: 1,
				dc: 1
			}, // diagonal1
			{
				dr: 1,
				dc: -1
			} // diagonal2
		];

		let flippedPieces = [];

		directions.forEach((
		{
			dr,
			dc
		}) =>
		{
			flippedPieces = flippedPieces.concat(captureInDirection(index, dr, dc));
		});

		return flippedPieces;
	}

	function captureInDirection(index, dr, dc)
	{
		let currentPlayer = getCurrentPlayer();

		let firstEndPiece;
		let secondEndPiece;
		let flipPieces = false;
		let flipped = [];

		// Scan in the positive direction
		for (let i = 1; i < size; i++)
		{
			const r = Math.floor(index / size) + dr * i;
			const c = index % size + dc * i;
			const idx = r * size + c;

			if (r < 0 || r >= size || c < 0 || c >= size)
			{
				break;
			}

			const cell = game.children[idx];

			if (cell && cell.classList.contains("f") && !cell.classList.contains("p" + (currentPlayer.index + 1)))
			{
				firstEndPiece = cell;
				break;
			}
			else if (!cell || !cell.classList.contains("p" + (currentPlayer.index + 1)))
			{
				break;
			}
		}

		// Scan in the negative direction
		for (let i = 1; i < size; i++)
		{
			const r = Math.floor(index / size) - dr * i;
			const c = index % size - dc * i;
			const idx = r * size + c;

			if (r < 0 || r >= size || c < 0 || c >= size)
			{
				break;
			}

			const cell = game.children[idx];

			if (cell && cell.classList.contains("f") && !cell.classList.contains("p" + (currentPlayer.index + 1)))
			{
				secondEndPiece = cell;
				break;
			}
			else if (!cell || !cell.classList.contains("p" + (currentPlayer.index + 1)))
			{
				break;
			}
		}

		// If valid sequence found in both directions, flip pieces
		if (firstEndPiece && secondEndPiece)
		{
			if(firstEndPiece.className == secondEndPiece.className)
			{
				firstEndPiece.classList.remove(...firstEndPiece.classList);
				firstEndPiece.classList.add("c", "f", "p" + (currentPlayer.index + 1));
				flipped.push(firstEndPiece.dataset.index);
				
				secondEndPiece.classList.remove(...secondEndPiece.classList);
				secondEndPiece.classList.add("c", "f", "p" + (currentPlayer.index + 1));
				flipped.push(secondEndPiece.dataset.index);
			}
		}

		return flipped;
	}

	function checkWin(index)
	{
		const directions = [
			{
				dr: 0,
				dc: 1
			}, // horizontal
			{
				dr: 1,
				dc: 0
			}, // vertical
			{
				dr: 1,
				dc: 1
			}, // diagonal1
			{
				dr: 1,
				dc: -1
			} // diagonal2
		];

		for (const
			{
				dr,
				dc
			}
			of directions)
		{
			let count = 1;
			count += countInDirection(index, dr, dc);
			count += countInDirection(index, -dr, -dc);

			if (count >= 5)
			{
				return true;
			}
		}
		return false;
	}

	function countInDirection(index, dr, dc)
	{
		let count = 0;
		for (let i = 1; i < size; i++)
		{
			const r = Math.floor(index / size) + dr * i;
			const c = index % size + dc * i;
			const idx = r * size + c;
			if (r >= 0 && r < size && c >= 0 && c < size && game.children[idx] && game.children[idx].classList.contains('p' + (getCurrentPlayer().index + 1)))
			{
				count++;
			}
			else
			{
				break;
			}
		}
		return count;
	}

	function resetGame()
	{
		game.innerHTML = "";
		log.innerHTML = "";
		localLog = [];
		database.ref('gameLogs/' + gameID).remove();
		initializeBoard();
		allowedMoves.clear();

		gameObject.state.latestLog = getPlayerByID(userID).name + " restarted the game.";
		gameObject.state.playerIndexTurn = 0;
		gameObject.state.gameOver = false;
		
		document.querySelector("#resetButton").classList.add("hidden");
		sendGameInformation();
	}
});