from typing import List, Optional

OPENING_DATABASE = [
    # 1. e4 openings
    (["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"], "Sicilian Defense: Najdorf Variation"),
    (["e2e4", "c7c5", "g1f3", "e7e6"], "Sicilian Defense: French Variation"),
    (["e2e4", "c7c5", "g1f3", "b8c6"], "Sicilian Defense: Old Sicilian"),
    (["e2e4", "c7c5", "c2c3"], "Sicilian Defense: Alapin Variation"),
    (["e2e4", "c7c5"], "Sicilian Defense"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"], "Ruy Lopez: Morphy Defense"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"], "Ruy Lopez (Spanish Opening)"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f1c5"], "Italian Game: Giuoco Piano"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6"], "Italian Game: Two Knights Defense"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"], "Italian Game"),
    (["e2e4", "e7e5", "g1f3", "b8c6", "d2d4"], "Scotch Game"),
    (["e2e4", "e7e5", "g1f3", "g8f6"], "Petrov's Defense"),
    (["e2e4", "e7e5", "f2f4"], "King's Gambit"),
    (["e2e4", "e7e5"], "Open Game (King's Pawn)"),
    (["e2e4", "e7e6", "d2d4", "d7d5"], "French Defense"),
    (["e2e4", "e7e6"], "French Defense"),
    (["e2e4", "c7c6", "d2d4", "d7d5"], "Caro-Kann Defense"),
    (["e2e4", "c7c6"], "Caro-Kann Defense"),
    (["e2e4", "d7d6", "d2d4", "g8f6", "b1c3", "g7g6"], "Pirc Defense"),
    (["e2e4", "g7g6"], "Modern Defense"),
    (["e2e4", "d7d5"], "Scandinavian Defense"),
    (["e2e4", "g8f6"], "Alekhine's Defense"),
    (["e2e4"], "King's Pawn Opening"),

    # 1. d4 openings
    (["d2d4", "d7d5", "c2c4", "e7e6"], "Queen's Gambit Declined"),
    (["d2d4", "d7d5", "c2c4", "c7c6"], "Slav Defense"),
    (["d2d4", "d7d5", "c2c4", "d5c4"], "Queen's Gambit Accepted"),
    (["d2d4", "d7d5", "c2c4"], "Queen's Gambit"),
    (["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"], "King's Indian Defense"),
    (["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "d7d5"], "Grünfeld Defense"),
    (["d2d4", "g8f6", "c2c4", "e7e6", "b1c3", "f8b4"], "Nimzo-Indian Defense"),
    (["d2d4", "g8f6", "c2c4", "e7e6", "g1f3", "b7b6"], "Queen's Indian Defense"),
    (["d2d4", "g8f6", "c2c4", "c7c5", "d4d5"], "Benoni Defense"),
    (["d2d4", "g8f6", "c1f4"], "London System"),
    (["d2d4", "g8f6", "g1f3"], "Indian Defense"),
    (["d2d4", "f7f5"], "Dutch Defense"),
    (["d2d4", "d7d5"], "Queen's Pawn Game"),
    (["d2d4"], "Queen's Pawn Opening"),

    # 1. c4, 1. Nf3 and flanks
    (["c2c4", "e7e5"], "English Opening: King's English"),
    (["c2c4", "c7c5"], "English Opening: Symmetrical"),
    (["c2c4"], "English Opening"),
    (["g1f3", "d7d5", "g2g3"], "King's Indian Attack"),
    (["g1f3"], "Réti Opening"),
    (["f2f4"], "Bird's Opening"),
    (["b2b3"], "Nimzo-Larsen Attack"),
]

def identify_opening(moves_uci: List[str]) -> str:
    """
    Identifies the opening name based on the sequence of moves.
    Returns opening name or 'Unknown / Custom Position' if not matched.
    """
    if not moves_uci:
        return "Starting Position"
    
    # Match longest sequence first
    best_match = None
    longest_len = 0
    
    for prefix, name in OPENING_DATABASE:
        prefix_len = len(prefix)
        if len(moves_uci) >= prefix_len:
            if moves_uci[:prefix_len] == prefix:
                if prefix_len > longest_len:
                    longest_len = prefix_len
                    best_match = name
    
    return best_match if best_match else "Custom Opening / Variation"
