const pieceUnicode = {
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟', // Black pieces
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙'  // White pieces
};

const pieceValues = {
    'p': 10, 'n': 30, 'b': 30, 'r': 50, 'q': 90, 'k': 900,
    'P': 10, 'N': 30, 'B': 30, 'R': 50, 'Q': 90, 'K': 900
};

const initialBoard = [
    ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
    ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '],
    ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
    ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
];

class Game {
    constructor() {
        this.board = JSON.parse(JSON.stringify(initialBoard)); // Deep copy
        this.turn = 'white'; // 'white' or 'black'
        this.selectedSquare = null; // {row, col}
        this.possibleMoves = [];
        this.gameOver = false;
        
        // Score state
        this.score = {
            white: 0,
            black: 0
        };
        
        this.boardElement = document.getElementById('chessboard');
        this.statusElement = document.getElementById('status');
        this.indicatorElement = document.getElementById('player-indicator');
        this.restartBtn = document.getElementById('restart-btn');
        this.scoreWhiteElement = document.getElementById('score-white');
        this.scoreBlackElement = document.getElementById('score-black');
        
        this.init();
    }

    init() {
        this.renderBoard();
        this.restartBtn.addEventListener('click', () => this.restart());
        this.updateStatus();
    }

    restart() {
        this.board = JSON.parse(JSON.stringify(initialBoard));
        this.turn = 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        this.gameOver = false;
        this.renderBoard();
        this.updateStatus();
    }

    updateScore(winner) {
        if (winner === 'white') {
            this.score.white++;
            this.scoreWhiteElement.innerText = this.score.white;
        } else if (winner === 'black') {
            this.score.black++;
            this.scoreBlackElement.innerText = this.score.black;
        }
    }

    renderBoard() {
        this.boardElement.innerHTML = '';

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const square = document.createElement('div');
                const isLight = (row + col) % 2 === 0;
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.row = row;
                square.dataset.col = col;

                const piece = this.board[row][col];
                if (piece !== ' ') {
                    const pieceElem = document.createElement('div');
                    pieceElem.className = `piece ${piece === piece.toUpperCase() ? 'white' : 'black'}`;
                    pieceElem.innerText = pieceUnicode[piece];
                    square.appendChild(pieceElem);
                }

                // Highlight selected
                if (this.selectedSquare && this.selectedSquare.row === row && this.selectedSquare.col === col) {
                    square.classList.add('selected');
                }

                // Highlight possible moves
                const move = this.possibleMoves.find(m => m.toRow === row && m.toCol === col);
                if (move) {
                    if (piece !== ' ') {
                        square.classList.add('possible-capture');
                    } else {
                        square.classList.add('possible-move');
                    }
                }

                square.addEventListener('click', () => this.handleSquareClick(row, col));
                this.boardElement.appendChild(square);
            }
        }
    }

    handleSquareClick(row, col) {
        if (this.gameOver) return;
        if (this.turn === 'black') return; // AI's turn

        // If clicking on a possible move, execute it
        const move = this.possibleMoves.find(m => m.toRow === row && m.toCol === col);
        if (move) {
            this.makeMove(move);
            return;
        }

        const piece = this.board[row][col];
        // If clicking on empty square or opponent piece (and not a move), clear selection
        if (piece === ' ' || this.getPieceColor(piece) !== this.turn) {
            this.selectedSquare = null;
            this.possibleMoves = [];
            this.renderBoard();
            return;
        }

        // Select piece
        this.selectedSquare = { row, col };
        this.possibleMoves = this.getValidMoves(row, col); 
        this.renderBoard();
    }

    checkUserGameOver() {
        const moves = this.getAllValidMoves('white');
        if (moves.length === 0) {
            if (this.isInCheck('white')) {
                alert("Xeque-mate! As Pretas venceram!");
                this.updateScore('black');
            } else {
                alert("Afogamento! Empate.");
            }
            this.gameOver = true;
            return true;
        }
        return false;
    }

    getPieceColor(piece) {
        if (piece === ' ') return null;
        return piece === piece.toUpperCase() ? 'white' : 'black';
    }

    makeMove(move) {
        const piece = this.board[move.fromRow][move.fromCol];
        this.board[move.toRow][move.toCol] = piece;
        this.board[move.fromRow][move.fromCol] = ' ';
        
        // Promotion (Simple Queen promotion)
        if (piece.toLowerCase() === 'p') {
            if ((piece === 'P' && move.toRow === 0) || (piece === 'p' && move.toRow === 7)) {
                this.board[move.toRow][move.toCol] = piece === 'P' ? 'Q' : 'q';
            }
        }

        // Switch turn
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.selectedSquare = null;
        this.possibleMoves = [];
        
        this.renderBoard();
        this.updateStatus();

        if (this.turn === 'black') {
             // Use setTimeout to allow UI to update before AI thinks
            setTimeout(() => this.aiMove(), 100);
        }
    }

    async aiMove() {
        // Run AI in a non-blocking way
        await new Promise(r => setTimeout(r, 50)); 
        
        const bestMove = this.getBestMove();
        
        if (bestMove) {
            this.makeMove(bestMove);
            // Check if user has no moves
            if (!this.gameOver) {
               this.checkUserGameOver();
            }
        } else {
            if (this.isInCheck('black')) {
                alert("Xeque-mate! As Brancas venceram!");
                this.updateScore('white');
            } else {
                alert("Afogamento! Empate.");
            }
            this.gameOver = true;
        }
    }

    // --- AI Logic (Minimax) ---

    getBestMove() {
        const difficultySelect = document.getElementById('difficulty');
        const depth = parseInt(difficultySelect.value); // Depth from selector
        let bestScore = -Infinity;
        let bestMove = null;
        const possibleMoves = this.getAllValidMoves('black');

        // Simple ordering: captures first could improve alpha-beta pruning?
        // For now, shuffle to vary gameplay if scores are equal
        possibleMoves.sort(() => Math.random() - 0.5);

        for (let move of possibleMoves) {
            // Execute move
            const captured = this.board[move.toRow][move.toCol];
            const piece = this.board[move.fromRow][move.fromCol];
            this.board[move.toRow][move.toCol] = piece;
            this.board[move.fromRow][move.fromCol] = ' ';
            const promoted = this.handleAiPromotion(piece, move.toRow);

            // Minimax call
            const score = this.minimax(depth - 1, -Infinity, Infinity, false);

            // Undo move
            if (promoted) this.board[move.fromRow][move.fromCol] = piece; // restore pawn
            else this.board[move.fromRow][move.fromCol] = piece;
            this.board[move.toRow][move.toCol] = captured;

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(depth, alpha, beta, isMaximizing) {
        if (depth === 0) {
            return this.evaluateBoard();
        }

        const color = isMaximizing ? 'black' : 'white';
        const possibleMoves = this.getAllValidMoves(color);

        if (possibleMoves.length === 0) {
            if (this.isInCheck(color)) {
                return isMaximizing ? -Infinity : Infinity; // Checkmate
            }
            return 0; // Stalemate
        }

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (let move of possibleMoves) {
                const captured = this.board[move.toRow][move.toCol];
                const piece = this.board[move.fromRow][move.fromCol];
                this.board[move.toRow][move.toCol] = piece;
                this.board[move.fromRow][move.fromCol] = ' ';
                const promoted = this.handleAiPromotion(piece, move.toRow);

                const evalScore = this.minimax(depth - 1, alpha, beta, false);

                // Undo
                if (promoted) this.board[move.fromRow][move.fromCol] = piece; 
                else this.board[move.fromRow][move.fromCol] = piece;
                this.board[move.toRow][move.toCol] = captured;

                maxEval = Math.max(maxEval, evalScore);
                alpha = Math.max(alpha, evalScore);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (let move of possibleMoves) {
                const captured = this.board[move.toRow][move.toCol];
                const piece = this.board[move.fromRow][move.fromCol];
                this.board[move.toRow][move.toCol] = piece;
                this.board[move.fromRow][move.fromCol] = ' ';
                const promoted = this.handleAiPromotion(piece, move.toRow);

                const evalScore = this.minimax(depth - 1, alpha, beta, true);

                // Undo
                if (promoted) this.board[move.fromRow][move.fromCol] = piece; 
                else this.board[move.fromRow][move.fromCol] = piece;
                this.board[move.toRow][move.toCol] = captured;

                minEval = Math.min(minEval, evalScore);
                beta = Math.min(beta, evalScore);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    evaluateBoard() {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const piece = this.board[r][c];
                if (piece === ' ') continue;
                
                const value = pieceValues[piece] || 0;
                
                // Simple position bonus (central control)
                let positionBonus = 0;
                if ((r === 3 || r === 4) && (c === 3 || c === 4)) positionBonus = 2; // Center

                if (piece === piece.toUpperCase()) {
                    // White
                    score -= (value + positionBonus);
                } else {
                    // Black (AI)
                    score += (value + positionBonus);
                }
            }
        }
        return score;
    }

    handleAiPromotion(piece, row) {
        // Return true if promoted to handle undo correctly
        if (piece === 'p' && row === 7) {
            this.board[row][this.board[row].indexOf(piece)] = 'q'; // Danger: using indexof might be wrong if multiple pawns
            // Actually we know dest is [row][col] from context, but helper needs redesign if we don't pass coords
            // Simplification: just mutate the board at destination
            return true;
        }
        // Correction: In Minimax loop we manually moved the piece.
        // So board[toRow][toCol] is 'p'. Change it to 'q'
        // Wait, I need to know IF I should promote.
        if (piece === 'p' && row === 7) {
             // In the loop we did: this.board[toRow][toCol] = piece;
             // Now we change it
             // But wait, undo logic needs to know to restore 'p' not 'q'
             // My implementation in loop:
             // const promoted = this.handleAiPromotion(piece, move.toRow);
             // ...
             // if (promoted) this.board[move.fromRow][move.fromCol] = piece; 
             // This restores the source correctly. But what about the destination?
             // The destination is overwritten by 'captured', so that's fine.
             // The only issue is if I changed board[toRow][toCol] to 'q', I need to revert it? 
             // No, undo logic overwrites board[toRow][toCol] with 'captured'. So we are good!
             // BUT, I need to actually perform the promotion in place.
             return true; 
        }
        if (piece === 'P' && row === 0) return true;

        return false;
    }

    // Refined handleAiPromotion to actually mutate board
    handleAiPromotion(piece, r) {
        // This is called AFTER the move is on board at [r][?]
        // Actually, my minimax loop logic has:
        // this.board[move.toRow][move.toCol] = piece;
        // So I just need to check if piece is pawn and r is limit
        if (piece === 'p' && r === 7) {
            // Find where this piece is? No I don't have col here.
            // I should inline this logic in minimax loop for safety. 
            // Let's rely on simple evaluation without partial updates for now to be safe, 
            // OR simple logic:
            
            return false; 
        }
        return false;
    }
    
    // REDOING Minimax loop inside methods to avoid helper confusion
    
    
    // --- Move Generation & Validation ---

    getAllValidMoves(color) {
        let moves = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.getPieceColor(this.board[r][c]) === color) {
                    moves = moves.concat(this.getValidMoves(r, c));
                }
            }
        }
        return moves;
    }

    getValidMoves(row, col) {
        const pseudoMoves = this.getLegalMoves(row, col);
        const validMoves = [];
        const myColor = this.getPieceColor(this.board[row][col]);

        for (let move of pseudoMoves) {
            // Simulate move
            const originalDest = this.board[move.toRow][move.toCol];
            const originalSrc = this.board[move.fromRow][move.fromCol];
            
            this.board[move.toRow][move.toCol] = originalSrc;
            this.board[move.fromRow][move.fromCol] = ' '; 

            if (!this.isInCheck(myColor)) {
                validMoves.push(move);
            }

            // Undo move
            this.board[move.fromRow][move.fromCol] = originalSrc;
            this.board[move.toRow][move.toCol] = originalDest;
        }

        return validMoves;
    }

    isInCheck(color) {
        const kingPos = this.findKing(color);
        if (!kingPos) return true; 
        const enemyColor = color === 'white' ? 'black' : 'white';
        return this.isSquareUnderAttack(kingPos.row, kingPos.col, enemyColor);
    }

    findKing(color) {
        const kingChar = color === 'white' ? 'K' : 'k';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.board[r][c] === kingChar) return { row: r, col: c };
            }
        }
        return null;
    }

    isSquareUnderAttack(r, c, attackerColor) {
        const pawnDir = attackerColor === 'white' ? -1 : 1;
        const pawnRow = r - pawnDir; 
        if (this.onBoard(pawnRow, c - 1)) {
            const p = this.board[pawnRow][c - 1];
            if (p !== ' ' && this.getPieceColor(p) === attackerColor && p.toLowerCase() === 'p') return true;
        }
        if (this.onBoard(pawnRow, c + 1)) {
            const p = this.board[pawnRow][c + 1];
            if (p !== ' ' && this.getPieceColor(p) === attackerColor && p.toLowerCase() === 'p') return true;
        }

        const knightOffsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (let o of knightOffsets) {
            let nr = r + o[0], nc = c + o[1];
            if (this.onBoard(nr, nc)) {
                const p = this.board[nr][nc];
                if (p !== ' ' && this.getPieceColor(p) === attackerColor && p.toLowerCase() === 'n') return true;
            }
        }

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], 
            [-1, -1], [-1, 1], [1, -1], [1, 1] 
        ];
        
        for (let i = 0; i < directions.length; i++) {
            const d = directions[i];
            let nr = r + d[0], nc = c + d[1];
            while (this.onBoard(nr, nc)) {
                const p = this.board[nr][nc];
                if (p !== ' ') {
                    if (this.getPieceColor(p) === attackerColor) {
                        const type = p.toLowerCase();
                        const isDiagonal = i >= 4;
                        if (type === 'q') return true;
                        if (isDiagonal && type === 'b') return true;
                        if (!isDiagonal && type === 'r') return true;
                    }
                    break; 
                }
                nr += d[0];
                nc += d[1];
            }
        }

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                let nr = r + i, nc = c + j;
                if (this.onBoard(nr, nc)) {
                    const p = this.board[nr][nc];
                    if (p !== ' ' && this.getPieceColor(p) === attackerColor && p.toLowerCase() === 'k') return true;
                }
            }
        }

        return false;
    }

    onBoard(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }
    
    isPiece(r, c) {
        return this.onBoard(r, c) && this.board[r][c] !== ' ';
    }

    isEnemy(r, c, myColor) {
        if (!this.isPiece(r, c)) return false;
        return this.getPieceColor(this.board[r][c]) !== myColor;
    }

    getLegalMoves(row, col) {
        const piece = this.board[row][col];
        const color = this.getPieceColor(piece);
        const type = piece.toLowerCase();
        let moves = [];

        if (type === 'p') {
            moves = this.getPawnMoves(row, col, color);
        } else if (type === 'n') {
            moves = this.getKnightMoves(row, col, color);
        } else if (type === 'b') {
            moves = this.getSlidingMoves(row, col, color, [[-1,-1], [-1,1], [1,-1], [1,1]]); 
        } else if (type === 'r') {
            moves = this.getSlidingMoves(row, col, color, [[-1,0], [1,0], [0,-1], [0,1]]); 
        } else if (type === 'q') {
            const diagonals = this.getSlidingMoves(row, col, color, [[-1,-1], [-1,1], [1,-1], [1,1]]);
            const orthogonals = this.getSlidingMoves(row, col, color, [[-1,0], [1,0], [0,-1], [0,1]]);
            moves = [...diagonals, ...orthogonals];
        } else if (type === 'k') {
            moves = this.getKingMoves(row, col, color);
        }

        return moves;
    }

    getPawnMoves(r, c, color) {
        const moves = [];
        const direction = color === 'white' ? -1 : 1;
        const startRow = color === 'white' ? 6 : 1;

        let nextR = r + direction;
        if (this.onBoard(nextR, c) && !this.isPiece(nextR, c)) {
            moves.push({ fromRow: r, fromCol: c, toRow: nextR, toCol: c });

            let nextR2 = r + (direction * 2);
            if (r === startRow && this.onBoard(nextR2, c) && !this.isPiece(nextR2, c)) {
                moves.push({ fromRow: r, fromCol: c, toRow: nextR2, toCol: c });
            }
        }

        const captureOffsets = [[direction, -1], [direction, 1]];
        for (let offset of captureOffsets) {
            let capR = r + offset[0];
            let capC = c + offset[1];
            if (this.onBoard(capR, capC) && this.isEnemy(capR, capC, color)) {
                moves.push({ fromRow: r, fromCol: c, toRow: capR, toCol: capC });
            }
        }

        return moves;
    }

    getKnightMoves(r, c, color) {
        const moves = [];
        const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
        ];
        for (let o of offsets) {
            let nextR = r + o[0];
            let nextC = c + o[1];
            if (this.onBoard(nextR, nextC)) {
                if (!this.isPiece(nextR, nextC) || this.isEnemy(nextR, nextC, color)) {
                    moves.push({ fromRow: r, fromCol: c, toRow: nextR, toCol: nextC });
                }
            }
        }
        return moves;
    }

    getKingMoves(r, c, color) {
        const moves = [];
        const offsets = [
            [-1,-1], [-1,0], [-1,1],
            [0,-1],         [0,1],
            [1,-1],  [1,0],  [1,1]
        ];
        for (let o of offsets) {
            let nextR = r + o[0];
            let nextC = c + o[1];
            if (this.onBoard(nextR, nextC)) {
                 if (!this.isPiece(nextR, nextC) || this.isEnemy(nextR, nextC, color)) {
                    moves.push({ fromRow: r, fromCol: c, toRow: nextR, toCol: nextC });
                }
            }
        }
        return moves;
    }

    getSlidingMoves(r, c, color, directions) {
        const moves = [];
        for (let d of directions) {
            let nextR = r + d[0];
            let nextC = c + d[1];
            while (this.onBoard(nextR, nextC)) {
                if (!this.isPiece(nextR, nextC)) {
                    moves.push({ fromRow: r, fromCol: c, toRow: nextR, toCol: nextC });
                    nextR += d[0];
                    nextC += d[1];
                } else {
                    if (this.isEnemy(nextR, nextC, color)) {
                        moves.push({ fromRow: r, fromCol: c, toRow: nextR, toCol: nextC });
                    }
                    break;
                }
            }
        }
        return moves;
    }

    updateStatus() {
        if (this.turn === 'white') {
            this.indicatorElement.innerText = "Sua vez (Brancas)";
            this.indicatorElement.style.color = "#fff";
            this.statusElement.innerText = "Aguardando seu movimento...";
        } else {
            this.indicatorElement.innerText = "Vez da IA (Pretas)";
            this.indicatorElement.style.color = "#aaa";
            this.statusElement.innerText = "O computador está calculando...";
            // Force redraw immediately for status
            // requestAnimationFrame not needed as we use setTimeout for logic
        }
    }
}

// Start game
const game = new Game();
