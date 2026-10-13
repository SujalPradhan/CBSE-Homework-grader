# Grader checks (private)

## Physics and geometry used by the checks
These are standard results. The server uses them only to decide whether numbers could come from a real measurement.
- Pendulum: T = 2π√(L/g), g = 981 cm/s². Accepts ±12% to allow for timing by hand and bob size.
- Bottle jets: horizontal range from a hole at height H with water surface at height Hw is about 2√((Hw−H)·H) (Torricelli). Real jets land at 50–115% of this, because of hole shape and the water level falling.
- Shadow: sun elevation from the NOAA low-precision solar formulae (about 0.1° accurate), checked against Delhi at the equinox in the tests. Accepts ±4° for timing and a slightly tilted stick.
- Hand area: any shape inside a length × width box has area ≤ length × width, and every closed curve has P² ≥ 4πA (isoperimetric inequality).
- Paper: school notebook and textbook paper is about 0.07–0.12 mm per sheet. The check accepts 0.055–0.3 mm.

## Not verified from a primary source
- The 0.45 lower bound on hand area ÷ (length × width) and the 11–24 cm child handspan range are design choices, not published figures. They are deliberately loose.
