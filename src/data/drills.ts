import type { Drill } from '@/types/drill.ts';

export const DRILLS: Drill[] = [
  // ============================================================
  // WARM-UP DRILLS (11 drills)
  // ============================================================

  {
    id: 'warm-up-tag-dribble',
    name: 'Dribble Tag',
    description:
      'Players dribble inside a grid while 1-2 taggers (without a ball) try to tag them. Tagged players perform a skill (e.g., 5 toe taps) before re-entering. Develops dribbling under pressure and spatial awareness in a fun, game-like format.',
    setup: 'Mark out a 20x20 yard grid with cones. Every player except the taggers has a ball.',
    coachingTips: [
      'Encourage players to keep the ball close and use changes of direction to escape.',
      'Remind dribblers to keep their heads up to see the taggers.',
      'Switch taggers every 60-90 seconds to keep energy high.',
    ],
    variations: [
      'Add more taggers to increase difficulty.',
      'Taggers also dribble a ball while trying to tag.',
      'Players must dribble with their weak foot only.',
    ],
    category: 'dribbling',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-dynamic-movement',
    name: 'Dynamic Movement Circuit',
    description:
      'Players move through a series of dynamic stretches and movements: high knees, butt kicks, side shuffles, carioca, skipping, and lunges. Prepares muscles for activity while improving coordination and body control.',
    setup:
      'Set up two lines of cones 20 yards apart. Players line up behind one line and perform each movement across to the other line.',
    coachingTips: [
      'Demonstrate each movement clearly before players begin.',
      'Ensure players maintain good posture and controlled movements.',
      'Progress from slow, controlled movements to faster, more explosive ones.',
    ],
    category: 'first-touch',
    phase: 'warm-up',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones'],
  },

  {
    id: 'warm-up-rondo-light',
    name: 'Light Rondo (4v1)',
    description:
      'Four players form a square and pass the ball while one defender in the middle tries to intercept. A low-pressure warm-up that reinforces passing accuracy, body positioning, and quick decision-making.',
    setup: 'Mark a 10x10 yard square with cones. Four players on the outside, one in the middle.',
    coachingTips: [
      'Open your body to see multiple passing options before receiving.',
      'Use one or two touches maximum to keep the ball moving.',
      'Defender should focus on cutting passing lanes rather than chasing.',
    ],
    variations: [
      'Increase to 5v2 for older players.',
      'Limit to one-touch passing.',
      'Award a point to the defender for every interception.',
    ],
    category: 'passing',
    phase: 'warm-up',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 5,
    durationMinutes: 10,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-ball-mastery',
    name: 'Ball Mastery Circuit',
    description:
      'Players work through a series of Coerver-style ball mastery moves at their own pace: toe taps, sole rolls, inside-outside touches, pull-backs, and scissors. Builds a foundation of close ball control and comfort on the ball.',
    setup:
      'Each player has a ball in a 15x15 yard grid. Coach demonstrates each move, players practice for 30-45 seconds before switching to the next.',
    coachingTips: [
      'Start slow and focus on correct technique before adding speed.',
      'Encourage use of both feet on every exercise.',
      'Make it fun by adding challenges: "How many toe taps in 30 seconds?"',
    ],
    variations: [
      'Add movement across the grid while performing moves.',
      "Pair up and mirror each other's moves.",
      'Introduce the "Coerver speed" challenge: do the move as fast as possible for 10 seconds.',
    ],
    category: 'first-touch',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10', 'U12'],
    minPlayers: 4,
    durationMinutes: 10,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-passing-pairs',
    name: 'Passing Pairs on the Move',
    description:
      'Pairs of players pass the ball back and forth while jogging across the field. Focuses on passing weight, first touch, and communication while raising the heart rate.',
    setup:
      'Players pair up with one ball. They start on one end line and pass while moving to the opposite end, then back.',
    coachingTips: [
      'Inside of the foot for short passes; keep the ankle locked.',
      'Receiving player should check to the ball and open their body.',
      'Emphasize calling for the ball and eye contact.',
    ],
    variations: [
      'Add a one-touch constraint.',
      'Increase distance between partners to practice driven passes.',
      'Add a defender who jogs between pairs to apply passive pressure.',
    ],
    category: 'passing',
    phase: 'warm-up',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['balls'],
  },

  {
    id: 'warm-up-sharks-and-minnows',
    name: 'Sharks and Minnows',
    description:
      'All players (minnows) dribble across a channel while 1-2 sharks try to kick their balls out. If your ball leaves the channel, you become a shark. Last minnow standing wins. An engaging warm-up that builds dribbling confidence and shielding skills.',
    setup:
      'Mark a 30x15 yard channel with cones. All minnows start on one end with a ball. Sharks start in the middle without a ball.',
    coachingTips: [
      'Use your body to shield the ball from sharks.',
      'Keep the ball close and use quick changes of direction.',
      'Look up to find space and avoid other players.',
    ],
    category: 'dribbling',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-keeper-handling',
    name: 'Goalkeeper Handling Warm-Up',
    description:
      'Goalkeepers work through a progressive handling circuit: rolling saves, low catches, mid-height catches, and high catches. Each round builds intensity gradually while reinforcing proper catching technique (W-shape hands, secure to chest).',
    setup:
      'Goalkeeper stands in front of a goal or between two cones 6 yards apart. A server stands 8-10 yards away with a supply of balls.',
    coachingTips: [
      'Start with gentle rolls and gradually increase shot speed.',
      'Ensure proper hand positioning: thumbs together for high balls, pinkies together for low balls.',
      'Footwork first, then hands - get the body behind the ball.',
    ],
    variations: [
      'Add a side-step between shots to work on lateral movement.',
      'Progress to diving saves once properly warmed up.',
    ],
    category: 'goalkeeping',
    phase: 'warm-up',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'low',
    equipment: ['cones', 'balls', 'gloves'],
  },

  {
    id: 'warm-up-cone-dribble-course',
    name: 'Cone Dribble Course',
    description:
      'Players weave through a line of cones using specified dribbling techniques (inside foot, outside foot, sole of foot). A simple, structured warm-up that develops close control and dribbling fundamentals.',
    setup:
      'Set up 8-10 cones in a line, spaced 2 yards apart. Players line up behind the first cone with a ball each.',
    coachingTips: [
      'Small touches to keep the ball close to the feet.',
      'Use both feet, not just the dominant foot.',
      'Accelerate out of the last cone to practice change of pace.',
    ],
    variations: [
      'Race against a partner on a parallel course.',
      'Add a turn at the end (Cruyff turn, drag back) before dribbling back.',
      'Time each run and challenge players to beat their personal best.',
    ],
    category: 'dribbling',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 2,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-passing-triangle',
    name: 'Triangle Passing',
    description:
      'Three players form a triangle and pass the ball around, following their pass to the next cone. Introduces movement off the ball and passing at angles, a core building block for combination play.',
    setup:
      'Set up three cones in a triangle, 10 yards apart. One player at each cone with one ball.',
    coachingTips: [
      'Pass and move immediately - do not stand and watch.',
      'Receive across the body to play forward.',
      'Use the correct foot to keep the ball on the move.',
    ],
    variations: [
      'Add a second ball for more complexity.',
      "Switch direction on the coach's whistle.",
      'Add a one-touch constraint.',
    ],
    category: 'passing',
    phase: 'warm-up',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 3,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'warm-up-juggling-challenge',
    name: 'Juggling Challenge',
    description:
      'Players practice juggling in a stationary position, counting consecutive touches. For younger players, one bounce between touches is allowed. Improves touch, coordination, and comfort on the ball.',
    setup: 'Each player has a ball in an open area with plenty of space between players.',
    coachingTips: [
      'Lock the ankle and use the laces to create a flat surface.',
      'Keep the ball below head height for better control.',
      'For beginners: catch the ball between touches and gradually reduce catches.',
    ],
    variations: [
      'Partner juggling - pass with a juggle touch to a partner.',
      'Thigh-only or head-only juggling rounds.',
      'Walking juggle - juggle while moving across the field.',
    ],
    category: 'first-touch',
    phase: 'warm-up',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 1,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['balls'],
  },

  {
    id: 'warm-up-mirror-dribble',
    name: 'Mirror Dribbling',
    description:
      'Two players face each other with a ball each. One player is the leader and performs dribbling moves; the other mirrors them. Develops observation, reaction time, and a wide repertoire of dribbling moves.',
    setup:
      'Players pair up facing each other, 3 yards apart, each with a ball. Spread pairs across a grid.',
    coachingTips: [
      'Leader should vary speed and moves to challenge the mirror.',
      'Both players keep their heads up to maintain eye contact.',
      'Switch leader and follower every 60 seconds.',
    ],
    category: 'dribbling',
    phase: 'warm-up',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 2,
    durationMinutes: 6,
    intensity: 'low',
    equipment: ['balls'],
  },

  // ============================================================
  // MAIN DRILLS (48 drills)
  // ============================================================

  // --- PASSING (7 drills) ---

  {
    id: 'passing-wall-pass-combination',
    name: 'Wall Pass (Give and Go)',
    description:
      'Players practice the classic wall pass combination: Player A passes to Player B and immediately sprints past the defender. Player B returns the ball into space for Player A to run onto. Teaches timing, weight of pass, and off-the-ball movement.',
    setup:
      'Set up a 20x15 yard channel with cones. One attacker, one wall player, and one passive defender. Rotate roles every 3 repetitions.',
    coachingTips: [
      "The initial pass should be firm and to the wall player's front foot.",
      'Sprint immediately after passing - do not wait to see if the return comes.',
      'Wall player plays the ball first time into the space ahead of the runner.',
    ],
    variations: [
      'Add a goal at the end to finish the combination.',
      'Make the defender active to increase pressure.',
      'Require the wall pass to be played with the weak foot.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
    diagram: `C 1,1  C 9,1  C 1,8  C 9,8
G 3,0 7,0
P 2,7 A
P 6,3 B
D 5,5
B 2,7

run A > 5,5
pass A > B

pass B > 8,1
run A > 8,1`,
  },

  {
    id: 'passing-six-cone-rotation',
    name: 'Six-Cone Passing Rotation',
    description:
      'Six cones form a hexagon. Players pass across the hexagon and follow their pass to a different cone. Develops passing accuracy, awareness of teammates, and movement after the pass.',
    setup:
      'Place 6 cones in a hexagon shape, 12 yards across. One player at each cone, two balls in circulation.',
    coachingTips: [
      'Call the name of the player you are passing to before the pass.',
      'Check your shoulder before receiving to know where the next pass should go.',
      'Quality of the first touch sets up the quality of the pass.',
    ],
    variations: [
      'Increase to three balls for advanced groups.',
      'Add one-touch restriction.',
      'Switch to left foot only.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'passing-long-range-driven',
    name: 'Long-Range Driven Passing',
    description:
      'Pairs of players stand 25-35 yards apart and practice driven passes along the ground and lofted passes through the air. Builds power and accuracy for switching the point of attack and playing over distance.',
    setup: 'Pairs of players, one ball per pair, positioned 25-35 yards apart on an open field.',
    coachingTips: [
      'Plant foot next to the ball, pointing at the target. Strike through the center of the ball for driven passes.',
      'For lofted passes, lean back slightly and strike under the ball with the laces.',
      'Receiving player should cushion the ball with the inside of the foot or chest.',
    ],
    variations: [
      'Add a target zone (cone gate) the ball must pass through.',
      'Alternate between driven and lofted passes.',
      'Introduce a first-touch-and-pass sequence to a third player.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'passing-y-shape-combination',
    name: 'Y-Shape Combination Play',
    description:
      'Players set up in a Y-shape and pass through a predetermined pattern: play into the central player, who lays off to a runner, who then switches the ball wide. Develops midfield combination play and third-man runs.',
    setup:
      'Set up cones in a Y-shape with the central point 15 yards from the base and two branches 10 yards apart. Players at each station rotate after completing the pattern.',
    coachingTips: [
      'Central player should check to the ball with an open body position.',
      'Lay-off pass must be weighted perfectly for the runner.',
      'Time the third-man run to arrive as the ball arrives.',
    ],
    variations: [
      'Add a defender at the central cone to create a realistic scenario.',
      'Finish the pattern with a cross and shot on goal.',
      'Mirror the pattern on both sides to practice switching play.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'passing-passing-under-pressure',
    name: 'Passing Under Pressure Grid',
    description:
      'In a 15x15 yard grid, 4 attackers try to keep possession against 2 defenders. Attackers earn a point for every 5 consecutive passes. Develops composure on the ball, quick decision-making, and passing accuracy under pressure.',
    setup:
      'Mark a 15x15 yard grid with cones. Four attackers spread around the grid, two defenders inside. Rotate defenders every 2 minutes.',
    coachingTips: [
      'Always offer a passing angle - create triangles around the ball.',
      'Receive the ball on the back foot to play away from pressure.',
      'Keep the ball on the ground and use one or two touches.',
    ],
    variations: [
      'Shrink the grid to increase pressure.',
      'Require one-touch passing only.',
      'Add a neutral player who always plays with the attacking team.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'passing-simple-pairs',
    name: 'Passing Pairs (Stationary)',
    description:
      'Two players pass the ball back and forth from a stationary position, focusing on technique: inside of the foot, firm ankle, follow through toward the target. The foundational passing drill for beginners.',
    setup: 'Players pair up, 8-10 yards apart, one ball per pair.',
    coachingTips: [
      'Plant foot beside the ball, toes pointing at your partner.',
      'Strike through the center of the ball with the inside of the foot.',
      'Cushion the ball with the inside of the foot on the receive, controlling it in front of you.',
    ],
    variations: [
      'Alternate feet with each pass.',
      'Gradually increase distance.',
      'Add a cone gate between players that the ball must pass through.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 2,
    durationMinutes: 8,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'passing-overlap-run',
    name: 'Overlap Run Pattern',
    description:
      'Players practice the overlap run pattern: a wide player passes inside, then sprints around and ahead to receive the ball back in space down the line. Teaches width in attack, timing of runs, and communication.',
    setup:
      'Use a 30x20 yard channel along the sideline. Wide player starts with the ball, central midfielder at the middle cone, and a target player at the far end.',
    coachingTips: [
      'The overlapping runner must time the run to stay onside and arrive at speed.',
      'Central player decides whether to play the overlap or continue centrally.',
      'The call "hold!" or "go!" should come from the overlapping player.',
    ],
    variations: [
      'Add a crossing and finishing element at the end.',
      'Include a defender to make the overlap decision real.',
      'Alternate between overlap and underlap runs.',
    ],
    category: 'passing',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  // --- DRIBBLING (6 drills) ---

  {
    id: 'dribbling-1v1-channel',
    name: '1v1 Channel Dribble',
    description:
      'An attacker tries to dribble past a defender in a narrow channel to cross an end line. Develops the ability to beat a defender in a realistic game situation using moves, feints, and changes of pace.',
    setup:
      "Mark a 15x8 yard channel with cones. Attacker starts at one end with the ball, defender at the other end. Attacker scores by dribbling over the defender's end line.",
    coachingTips: [
      'Attack the defender at speed to force them onto their heels.',
      'Use a feint or body movement before the actual move.',
      'Change pace after beating the defender - accelerate away.',
    ],
    variations: [
      'Widen or narrow the channel to adjust difficulty.',
      'Add a second defender who enters after 3 seconds.',
      'Score by stopping the ball on the end line (forces close control).',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls'],
    diagram: `C 1,0  C 9,0  C 1,8  C 9,8
P 5,7 A
D 5,2
B 5,7

run A > 5,2 > 5,0`,
  },

  {
    id: 'dribbling-moves-circuit',
    name: 'Moves Circuit',
    description:
      'Players rotate through stations, each focusing on a specific dribbling move: scissors, step-over, Cruyff turn, drag-back, and the Matthews cut. Each move is practiced in isolation before being applied in a 1v1.',
    setup:
      'Set up 4-5 stations around the field, each with cones simulating a defender. Players spend 2-3 minutes at each station before rotating.',
    coachingTips: [
      'Quality over speed: master the technique before adding pace.',
      'Exaggerate the body feint to sell the move.',
      'Practice every move with both feet.',
    ],
    variations: [
      'Add a passive defender at each station.',
      'Combine two moves in sequence (e.g., scissors into a Cruyff turn).',
      'Time trial: perform the move and dribble through a gate.',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 4,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'dribbling-traffic-grid',
    name: 'Traffic Dribbling Grid',
    description:
      'All players dribble freely inside a grid, navigating around each other and performing moves on the coach\'s command (e.g., "stop," "turn," "change pace"). Encourages heads-up dribbling and awareness.',
    setup: 'Mark a 20x20 yard grid (adjust based on numbers). Every player has a ball.',
    coachingTips: [
      'Keep the ball within playing distance at all times.',
      'Use different surfaces of the foot: inside, outside, sole, laces.',
      'Head up - scan for open space to dribble into.',
    ],
    variations: [
      'On "knock out," players try to kick others\' balls out while protecting their own.',
      'Add gates (two cones 2 yards apart) around the grid. Players score by dribbling through gates.',
      'Assign color zones that players must reach quickly when called.',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'dribbling-speed-dribble-relay',
    name: 'Speed Dribble Relay',
    description:
      'Teams line up in relay format and dribble to a turning cone and back as fast as possible. Teaches dribbling at speed using the laces (push and run) rather than close control. Competitive and high-energy.',
    setup:
      'Set up a turning cone 20-25 yards from the start line. Split players into teams of 3-4, each team with one ball.',
    coachingTips: [
      'Push the ball 2-3 yards ahead and sprint to it, rather than taking lots of small touches.',
      'Use the laces to push the ball when dribbling at speed.',
      'Control the ball before the turn - slow down, make a clean turn, then accelerate.',
    ],
    variations: [
      'Add obstacles (cones to weave through) on the way back.',
      'Each player must perform a specific skill at the turning cone before returning.',
      'Increase the distance for older age groups.',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10', 'U12'],
    minPlayers: 6,
    durationMinutes: 10,
    intensity: 'high',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'dribbling-gate-dribble',
    name: 'Gate Dribble Game',
    description:
      'Scatter cone gates (two cones 2 yards apart) across a grid. Players dribble through as many gates as possible in a set time. Cannot go through the same gate twice in a row. Develops vision, decision-making, and dribbling with purpose.',
    setup: 'Set up 10-12 gates randomly throughout a 25x25 yard grid. Every player has a ball.',
    coachingTips: [
      'Plan ahead - look for open gates before arriving at one.',
      'Change direction and speed to reach gates efficiently.',
      'Keep the ball close when approaching a gate to maintain control through it.',
    ],
    variations: [
      'Each gate is worth different points based on distance from the center.',
      'Add defenders who try to block gates.',
      'Require a specific dribbling move before going through each gate.',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U6', 'U8', 'U10', 'U12'],
    minPlayers: 4,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'dribbling-change-of-direction',
    name: 'Change of Direction Drill',
    description:
      "Players dribble in a straight line at speed, then perform a sharp change of direction on the coach's command or when reaching a cone. Practices the skill of cutting, turning, and accelerating that is used constantly in games to evade defenders.",
    setup:
      'Set up a 30-yard line with a cone every 10 yards. Players dribble toward each cone and change direction at each one.',
    coachingTips: [
      'Plant the outside foot and cut the ball with the inside of the other foot.',
      'Drop the shoulder before the turn to sell the fake.',
      'Explode out of the turn - the first two steps should be fast.',
    ],
    variations: [
      'Coach calls "left" or "right" to dictate direction.',
      'Add a trailing defender to increase urgency.',
      'Combine different turn types: Cruyff, drag-back, inside hook.',
    ],
    category: 'dribbling',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  // --- SHOOTING (6 drills) ---

  {
    id: 'shooting-stationary-strike',
    name: 'Stationary Shooting Technique',
    description:
      'Players practice striking a stationary ball from the edge of the box, focusing on proper technique: plant foot placement, laces strike, follow-through, and body over the ball. The foundation of goal-scoring.',
    setup:
      'Place balls on the edge of the penalty area. Players line up and take turns striking at goal. A goalkeeper or target is in the goal.',
    coachingTips: [
      'Plant foot beside the ball, pointing at the target.',
      'Strike through the center of the ball with the laces, toe pointed down.',
      'Follow through in the direction of the target; land on the striking foot.',
    ],
    variations: [
      'Add targets in the corners of the goal (cones or shirts).',
      'Practice with both feet.',
      'Move the starting position to different angles.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'shooting-turn-and-shoot',
    name: 'Turn and Shoot',
    description:
      'Players receive a pass with their back to goal, turn, and shoot. Develops the ability to receive under pressure, create space with a first touch, and finish quickly. A key skill for strikers.',
    setup:
      'Server stands 25 yards from goal with a supply of balls. Shooter starts at the penalty spot with back to goal. Server plays the ball in, shooter controls, turns, and finishes.',
    coachingTips: [
      'Check away from goal to create space to turn into.',
      'Use a soft first touch across the body to open up the goal.',
      'Shoot quickly after turning - the first chance is often the best chance.',
    ],
    variations: [
      'Add a passive defender behind the shooter.',
      'Vary the type of service: bouncing, driven, lofted.',
      'Alternate between turning left and turning right.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals'],
    diagram: `G 3,0 7,0
GK 5,1
P 5,5 S
P 5,9 Sv
B 5,9

pass Sv > S
run S > 4,4
pass S > 5,1`,
  },

  {
    id: 'shooting-crossing-and-finishing',
    name: 'Crossing and Finishing',
    description:
      'A wide player delivers crosses from the flank while attackers time runs to finish on goal. Practices crossing technique, movement in the box, and finishing from different types of service.',
    setup:
      "Wide player starts near the corner flag area with balls. Two attackers start at the top of the box. On the coach's signal, the winger crosses and attackers attack near post, far post, or penalty spot.",
    coachingTips: [
      'Crosser should look up before crossing to pick out a target.',
      'Attackers time runs to arrive as the ball arrives - do not stand and wait.',
      'Near-post attacker goes for a glancing header or redirect; far-post attacker looks for a volley or cushioned finish.',
    ],
    variations: [
      'Add a defender to challenge the attackers.',
      'Alternate between driven crosses and floated crosses.',
      'Include a pullback option for a shot from the edge of the box.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'shooting-finishing-circuit',
    name: 'Finishing Circuit',
    description:
      'Players rotate through three finishing stations: a volley from a tossed ball, a one-touch finish from a ground pass, and a dribble-and-shoot from the top of the box. High volume repetition builds confidence in front of goal.',
    setup:
      'Set up three stations around the penalty area, each with a server and supply of balls. Players rotate through all three stations, spending 3-4 minutes at each.',
    coachingTips: [
      'Focus on hitting the target first, power second.',
      'Keep the body balanced and composed at the moment of striking.',
      'Follow up every shot in case the goalkeeper spills it.',
    ],
    variations: [
      'Add a time limit (e.g., 2-second shot clock) at each station.',
      'Add a fourth station for headers.',
      'Make it competitive: track goals scored at each station.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'shooting-volley-technique',
    name: 'Volley Technique',
    description:
      'Players practice volleying from hand-fed tosses, focusing on keeping the knee over the ball, locking the ankle, and making clean contact. Progresses from self-toss to partner toss to crossed ball volleys.',
    setup:
      'Players start 12-15 yards from goal. They toss the ball to themselves and volley at goal. Progress to a partner tossing for them.',
    coachingTips: [
      'Watch the ball all the way onto the foot.',
      'Lock the ankle firmly and point the toe down.',
      'Lean slightly forward over the ball to keep the shot down.',
    ],
    variations: [
      'Side volley technique with the ball dropping from the side.',
      'Half-volley: let the ball bounce once before striking.',
      'Volley from a crossed ball for game-realistic finishing.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['balls', 'goals'],
  },

  {
    id: 'shooting-breakaway-finishing',
    name: 'Breakaway Finishing',
    description:
      'A player receives a through ball and goes 1v1 against the goalkeeper. Practices composure under pressure, reading the goalkeeper, and choosing the correct finishing technique (placement, chip, or round the keeper).',
    setup:
      'Server stands at the halfway line with balls. Attacker starts onside. Server plays a through ball, attacker sprints to finish against the goalkeeper.',
    coachingTips: [
      'Get the ball under control quickly - a poor first touch in a breakaway is fatal.',
      'Read the goalkeeper: if they rush out, chip or go around them; if they stay back, pick a corner.',
      'Stay relaxed and composed - do not rush the finish.',
    ],
    variations: [
      'Add a recovering defender chasing from behind.',
      'Vary the angle of the through ball (central, left, right).',
      'Start the attacker further away for a longer sprint.',
    ],
    category: 'shooting',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals'],
  },

  // --- FIRST TOUCH (5 drills) ---

  {
    id: 'first-touch-cushion-control',
    name: 'Cushion Control',
    description:
      'Players receive balls at various heights (ground, bouncing, aerial) and practice cushioning the ball to a dead stop using the inside of the foot, thigh, and chest. The essential first-touch skill for all levels.',
    setup:
      'Players pair up, 10-15 yards apart, one ball per pair. Server varies the type of delivery (ground pass, bouncing pass, lofted toss).',
    coachingTips: [
      "Withdraw the receiving surface on contact to absorb the ball's energy.",
      'Get in line with the ball early and present a big target surface.',
      'After controlling, the ball should be within one step of the player.',
    ],
    variations: [
      'Control and pass back in one motion (directional first touch).',
      'Add a defender: player must control and shield.',
      'Use only the weak foot.',
    ],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['balls'],
  },

  {
    id: 'first-touch-directional',
    name: 'Directional First Touch',
    description:
      'Players receive a pass and use their first touch to push the ball into a new direction (left, right, or forward) away from where the pass came from. Develops the ability to create space and play quickly.',
    setup:
      'Set up a triangle of cones 10 yards apart. A server passes to the central player, who takes a directional first touch toward one of two target cones, then passes back.',
    coachingTips: [
      'Open your body before the ball arrives so you can see where you want to go.',
      'Use the back foot (farthest from the server) to redirect the ball.',
      'The first touch should take you away from pressure and toward your next action.',
    ],
    variations: [
      'Add a passive defender so the player must read which way to turn.',
      'Increase the pace of the service.',
      'Receive and play a forward pass to a third player.',
    ],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'first-touch-wall-rebound',
    name: 'Wall Rebound Touch',
    description:
      'Players pass against a wall or rebounder and control the return. Allows high-volume repetition of receiving and passing without needing a partner, building muscle memory for clean first touches.',
    setup: 'Player stands 5-8 yards from a wall or rebounder board with a ball.',
    coachingTips: [
      'Vary the pace of the pass to practice controlling different speeds.',
      'Use all surfaces: inside, outside, sole, thigh.',
      'Add movement: side-step between touches to simulate game movement.',
    ],
    variations: [
      'One-touch against the wall with alternating feet.',
      'Control with the chest and volley back.',
      'Mark a target on the wall and aim for it with each return pass.',
    ],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12', 'U14'],
    minPlayers: 1,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['balls'],
  },

  {
    id: 'first-touch-aerial-control',
    name: 'Aerial Ball Control',
    description:
      'Players practice controlling lofted balls out of the air using the chest, thigh, and foot. A critical skill for clearing long balls, receiving goal kicks, and bringing high passes under control.',
    setup:
      'Pairs stand 20 yards apart. One player serves a high ball, the other controls it with one or two touches and passes back on the ground.',
    coachingTips: [
      'Get under the flight of the ball early.',
      'Cushion with a big surface (chest or thigh) to bring it down, then touch with the foot.',
      'Relax the body on contact - tension causes the ball to bounce away.',
    ],
    variations: [
      'Control and shoot at a goal.',
      'Add a defender who challenges once the ball is controlled.',
      'Increase the height and distance of the serve.',
    ],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['balls'],
  },

  {
    id: 'first-touch-receive-and-turn',
    name: 'Receive, Turn, and Play',
    description:
      'A central player receives from one server, controls and turns, then plays to a second server on the opposite side. Simulates a midfielder receiving with back to play and transitioning the ball forward.',
    setup:
      'Two servers stand 20 yards apart with balls. The working player stands in the middle between them, alternating between receiving from each side.',
    coachingTips: [
      'Check your shoulder before the ball arrives to know which way to turn.',
      'Take the first touch across the body to open up toward the target.',
      'Keep the ball moving - receive, turn, and pass should be fluid.',
    ],
    variations: [
      'Add a passive defender behind the receiver.',
      'Limit to two touches (one to control, one to pass).',
      'Require a specific turn type on each repetition.',
    ],
    category: 'first-touch',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  // --- GOALKEEPING (4 drills) ---

  {
    id: 'goalkeeping-shot-stopping',
    name: 'Shot-Stopping Progression',
    description:
      'Goalkeeper faces shots of increasing difficulty: first ground shots, then mid-height shots, then high shots, then rapid-fire from close range. Builds handling, positioning, and reaction speed through volume.',
    setup:
      'Goalkeeper in a standard goal. 3-4 shooters line up 16-18 yards out with balls. Shooters take turns, one shot every 5-8 seconds.',
    coachingTips: [
      'Set position before each shot: feet shoulder-width apart, weight on the balls of the feet, hands ready.',
      'Make yourself big - do not turn sideways or flinch.',
      'Attack the ball - come to it rather than waiting for it to hit you.',
    ],
    variations: [
      'Add a deflector in front of the goal for unpredictable bounces.',
      'Two shooters fire in quick succession for recovery saves.',
      'Vary shot angles: left side, right side, central.',
    ],
    category: 'goalkeeping',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'gloves'],
  },

  {
    id: 'goalkeeping-distribution',
    name: 'Goalkeeper Distribution',
    description:
      'Goalkeeper practices various distribution methods: throwing (overarm and underarm), goal kicks, and playing out from the back with feet. Modern goalkeepers must be comfortable with the ball at their feet.',
    setup:
      'Goalkeeper starts with a ball in the 6-yard box. Target players stand at varying distances (10, 20, 35 yards). Goalkeeper distributes to each target in turn.',
    coachingTips: [
      'Overarm throw for distance and accuracy: step forward, release at head height.',
      'Roll-out for short, safe distribution: low and firm to feet.',
      'Goal kicks: approach at a slight angle, strike through the ball, follow through high.',
    ],
    variations: [
      'Add a pressing forward the keeper must avoid.',
      'Timed exercise: distribute to all targets within 30 seconds.',
      'Practice building out from the back with two center-backs.',
    ],
    category: 'goalkeeping',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals', 'gloves'],
  },

  {
    id: 'goalkeeping-1v1-saves',
    name: '1v1 Save Situations',
    description:
      'Attacker dribbles at the goalkeeper in a 1v1 breakaway. Goalkeeper practices when to come out, how to make themselves big, and how to make the save. Critical decision-making under pressure.',
    setup:
      'Attacker starts 25 yards from goal with a ball. Goalkeeper starts on the goal line. On the whistle, the attacker dribbles at the keeper.',
    coachingTips: [
      'Come out to narrow the angle but do not overcommit.',
      'Stay on your feet as long as possible - going to ground early opens the goal.',
      'Make a big "star" shape to cover as much of the goal as possible.',
    ],
    variations: [
      'Add a second attacker for a 2v1 scenario.',
      'Start the attacker from different angles.',
      'Include a recovering defender to support the keeper.',
    ],
    category: 'goalkeeping',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'gloves'],
  },

  {
    id: 'goalkeeping-footwork-agility',
    name: 'Goalkeeper Footwork and Agility',
    description:
      'Goalkeeper works through a ladder and cone agility circuit, then immediately faces a shot on goal. Develops the quick feet, lateral movement, and recovery that are essential for making saves in rapid succession.',
    setup:
      'Set up an agility ladder 5 yards in front of the goal, with cones for lateral shuffling. A server waits 15 yards from goal with a ball. Keeper goes through the footwork then immediately faces a shot.',
    coachingTips: [
      'Stay light on the feet throughout the footwork exercise.',
      'Recover to a set position as quickly as possible after the agility circuit.',
      'Do not sacrifice technique for speed - clean footwork first.',
    ],
    variations: [
      'Change the direction of the first shot after the agility work.',
      'Add two rapid shots in succession.',
      'Include a cross to catch after the initial save.',
    ],
    category: 'goalkeeping',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'gloves', 'agility ladder'],
  },

  // --- ATTACKING (5 drills) ---

  {
    id: 'attacking-2v1-overload',
    name: '2v1 Overload',
    description:
      'Two attackers versus one defender in a channel leading to goal. Teaches decision-making: when to dribble, when to pass, and how to use a numerical advantage to create a shooting opportunity.',
    setup:
      'Mark a 20x15 yard channel with a goal at one end. Two attackers start at the opposite end with one ball. One defender starts in the middle.',
    coachingTips: [
      'Ball carrier should drive at the defender to commit them before passing.',
      'Supporting attacker must provide a wide angle and stay level or ahead of the ball.',
      'If the defender does not commit, the ball carrier should shoot.',
    ],
    variations: [
      'Progress to 3v2 overloads.',
      'Add a time limit (8 seconds to score).',
      'Award bonus points for one-touch finishes.',
    ],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'attacking-3v2-to-goal',
    name: '3v2 Attack to Goal',
    description:
      'Three attackers break against two defenders and a goalkeeper. Introduces width, depth, and combination play in attack. Players must quickly read the defensive shape and exploit gaps.',
    setup:
      'Play on half a field. Three attackers start at the halfway line, two defenders start at the edge of the penalty area. Goalkeeper in goal.',
    coachingTips: [
      'Wide attackers should stretch the defense by staying near the sidelines.',
      'Central attacker drives forward to pull one defender, then releases the ball.',
      'Move the ball quickly - do not let the defense reorganize.',
    ],
    variations: [
      'Add a recovering third defender who chases from behind.',
      'Require at least 3 passes before shooting.',
      'If defenders win the ball, they can counter-attack to a mini-goal.',
    ],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'attacking-switching-play',
    name: 'Switching the Point of Attack',
    description:
      'Attackers practice recognizing when one side of the field is congested and switching the ball to the opposite flank to exploit space. Develops team shape, wide play, and long-range passing.',
    setup:
      'Play on a full-width field, 40 yards deep. Two teams of 5 with goals at each end. Mark the field into thirds vertically. Award bonus points for goals scored after switching play.',
    coachingTips: [
      'Scan the field constantly - when one side is overloaded, the opposite side has space.',
      'The switch pass should be crisp and played early, before the defense shifts.',
      'Wide players must stay wide and be ready to receive the switch.',
    ],
    variations: [
      'Require the switch to go through a central midfielder.',
      'Add a mandatory touch limit on each side before switching.',
      'Play with neutral wide players who are always on the attacking team.',
    ],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'attacking-final-third-entries',
    name: 'Final Third Entry Patterns',
    description:
      'Structured passing patterns to break into the final third: through balls behind the line, diagonal runs, and overlaps. Attackers work on coordinated movements to penetrate a defensive block.',
    setup:
      'Play on half a field. Four attackers work together to break through a line of three defenders set up at the edge of the penalty area. Goalkeeper in goal.',
    coachingTips: [
      'Time the run to match the pass - too early and you are offside, too late and the defender recovers.',
      'Use decoy runs to pull defenders out of position.',
      'The final pass must be played into space, not to feet, when runners are in behind.',
    ],
    variations: [
      'Add a midfield build-up phase before the final third entry.',
      'Require a specific pattern (e.g., wall pass, overlap) for each attempt.',
      'If defenders win the ball, they counter to a mini-goal at halfway.',
    ],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U14', 'U16', 'U18'],
    minPlayers: 8,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'attacking-combination-to-finish',
    name: 'Combination Play to Finish',
    description:
      'Players execute a set sequence of passes (layoff, wall pass, through ball) that ends with a shot on goal. Develops automatic combination play that can be used in games when space is tight.',
    setup:
      'Set up four cones in a diamond shape outside the penalty area. Players at each cone pass through the pattern. The final player shoots on goal.',
    coachingTips: [
      'Every pass should be crisp and to the correct foot.',
      'Move into the next position immediately after passing.',
      'The shooter should focus on finishing quality, not just getting a shot away.',
    ],
    variations: [
      'Add a defender in the middle who tries to intercept.',
      'Run the pattern from the left side and the right side.',
      'Allow the players to choose when to deviate from the pattern and go direct to goal.',
    ],
    category: 'attacking',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 5,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals'],
  },

  // --- DEFENDING (5 drills) ---

  {
    id: 'defending-1v1-jockeying',
    name: '1v1 Jockeying',
    description:
      'A defender practices the art of jockeying: staying goal-side, closing down at an angle, and delaying the attacker without diving in. The fundamental defensive skill that all players must learn.',
    setup:
      'Mark a 15x10 yard channel with an end line at each end. Attacker tries to dribble past the defender to the end line.',
    coachingTips: [
      'Approach quickly, then slow down and get into a low, balanced stance.',
      'Stay side-on to force the attacker onto their weaker foot.',
      'Do not lunge for the ball - wait for a heavy touch or the attacker to lose control.',
    ],
    variations: [
      'Widen the channel to give the attacker more space.',
      'Add a goal the defender is protecting.',
      'Award points for tackles won and for delays that force backward passes.',
    ],
    category: 'defending',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 2,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'defending-pressing-triggers',
    name: 'Pressing Triggers',
    description:
      'A team practices identifying and reacting to pressing triggers: a backwards pass, a heavy touch, or a slow pass. When the trigger occurs, the nearest players press aggressively to win the ball back high up the pitch.',
    setup:
      'Play 6v6 on a 40x30 yard field with mini-goals. One team builds from the back while the other looks for pressing triggers to win the ball.',
    coachingTips: [
      'Press as a unit - the first player closes the ball, the second cuts off the nearest passing lane.',
      'Recognize the trigger and react immediately - delay reduces the effectiveness of the press.',
      'If the press fails, recover quickly into defensive shape.',
    ],
    variations: [
      'Award bonus goals for winning the ball in the attacking third.',
      'Add a 5-second rule: if you win the ball, you must shoot within 5 seconds.',
      'Switch pressing teams every 3 minutes.',
    ],
    category: 'defending',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 12,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'defending-defensive-shape',
    name: 'Defensive Shape (Compact Unit)',
    description:
      'A back line of 4 practices moving as a compact unit: shifting side-to-side with the ball, dropping and pushing up together, and covering for each other when one player steps out. The foundation of organized team defense.',
    setup:
      'A line of 4 defenders faces an attacking team of 5 on half a field. Attackers pass the ball around; defenders shift to stay compact and goal-side.',
    coachingTips: [
      'The line should move together - if one player is 5 yards ahead, the line is broken.',
      'Communicate constantly: "push up," "drop," "shift left."',
      'The nearest defender pressures the ball; the others provide cover and balance.',
    ],
    variations: [
      'Add a midfield line of 3 in front of the back 4 to practice as a block.',
      'Allow the attackers to shoot when they find a gap in the defensive line.',
      'Practice transitioning from defending to attacking when the ball is won.',
    ],
    category: 'defending',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 9,
    durationMinutes: 20,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'defending-recovery-runs',
    name: 'Recovery Run Drill',
    description:
      'Defenders practice sprinting back into a defensive position after being caught out of position. Simulates transition moments when the team loses the ball and defenders must recover quickly.',
    setup:
      'A defender starts at the halfway line. An attacker receives a ball near the penalty area and attacks the goal. The defender must sprint back to get goal-side and make a challenge.',
    coachingTips: [
      'Sprint at full speed on the recovery run - every second counts.',
      'Run a curved recovery line to get goal-side, not straight at the attacker.',
      'Once goal-side, slow down and jockey to delay the attacker.',
    ],
    variations: [
      'Add a second attacker for a 2v1 recovery situation.',
      'Start the defender from different positions (wide, central).',
      'After recovering, play out from the back to transition to attack.',
    ],
    category: 'defending',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 3,
    durationMinutes: 12,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'defending-2v2-defending',
    name: '2v2 Defending Pairs',
    description:
      'Two defenders work together to stop two attackers in a small grid. Teaches the principles of first and second defender: one presses the ball while the other provides cover at an angle behind.',
    setup:
      'Mark a 20x15 yard grid with a goal at one end. Two attackers try to score against two defenders and a goalkeeper.',
    coachingTips: [
      'First defender: close down quickly and force the attacker one direction.',
      'Second defender: position at a 45-degree angle behind the first defender, ready to step in.',
      'Communicate: "I have ball!" and "I have cover!"',
    ],
    variations: [
      'Progress to 3v3 for more complex defensive situations.',
      'If defenders win the ball, they counter to a mini-goal.',
      'Rotate pairs so every combination gets practice together.',
    ],
    category: 'defending',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 5,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  // --- POSSESSION (5 drills) ---

  {
    id: 'possession-rondo-5v2',
    name: 'Rondo 5v2',
    description:
      'Five outside players keep the ball from two defenders inside a circle or square. The quintessential possession drill used at every level from youth to professional. Develops quick passing, movement, and defensive pressing in tight spaces.',
    setup:
      'Mark a 12x12 yard grid. Five attackers on the outside, two defenders inside. When a defender wins the ball, they swap with the attacker who lost it.',
    coachingTips: [
      'Always provide two passing options to the player on the ball.',
      'One-touch or two-touch maximum to keep the ball moving fast.',
      'Body position open to see as many teammates as possible.',
    ],
    variations: [
      'Shrink to 8x8 yards for one-touch only.',
      'Award a point for splitting the two defenders with a pass.',
      'Progress to 6v3 for advanced groups.',
    ],
    category: 'possession',
    phase: 'main',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 7,
    durationMinutes: 12,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'pinnies'],
    diagram: `Z 1,1 9,9
P 5,1 A
P 9,5 B
P 5,9 C
P 1,5 D
P 3,2 E
D 4,4
D 6,6
B 5,1

pass A > B
pass B > C
pass C > D`,
  },

  {
    id: 'possession-keep-away-zones',
    name: 'Zonal Keep-Away',
    description:
      'A grid is divided into zones. The team in possession must move the ball through all zones before scoring. Teaches players to switch play, find space, and be patient in possession.',
    setup:
      'Mark a 40x30 yard field and divide it into three vertical zones. Play 6v6 (or 5v5). Teams must pass through all three zones before shooting.',
    coachingTips: [
      'Do not force the ball forward - if the next zone is blocked, go back or switch.',
      'Players in the far zone should make themselves visible with movement and communication.',
      'Transition quickly when you lose the ball - press immediately.',
    ],
    variations: [
      'Add neutral players who always play with the attacking team.',
      'Require a minimum number of passes before advancing to the next zone.',
      'Allow "free play" once the ball reaches the final zone.',
    ],
    category: 'possession',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'possession-4v4-plus-3',
    name: '4v4+3 Possession',
    description:
      'Four players try to keep the ball from four others, aided by three neutral players who always support the team in possession. Creates a 7v4 advantage that teaches both attacking movement (create angles) and defensive pressing (how to press against numbers).',
    setup:
      'Mark a 25x25 yard grid. Two teams of 4 in different colored pinnies, plus 3 neutral players. Team in possession uses the neutrals to create overloads.',
    coachingTips: [
      'Neutral players should position themselves in spaces between defenders.',
      'The team in possession should move the ball side to side to unbalance the defense.',
      'When defending, decide: do you press high or drop and compact?',
    ],
    variations: [
      'Add end zones: score by playing into the end zone.',
      'Reduce neutral players to 2 or 1 to increase difficulty.',
      'Limit the neutral players to one-touch.',
    ],
    category: 'possession',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 11,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'possession-keep-ball-3v1',
    name: 'Keep Ball 3v1',
    description:
      'Three players keep the ball from one defender in a small grid. A simpler progression for younger players learning the basics of keeping possession: create triangles, support at angles, and move after passing.',
    setup: 'Mark a 10x10 yard grid. Three attackers on the outside, one defender inside.',
    coachingTips: [
      'Always form a triangle around the ball - never stand in a line.',
      'Move to a new position immediately after passing.',
      'Use the open body shape to see all options.',
    ],
    variations: [
      'Restrict to two-touch.',
      'Make the defender win the ball three times before swapping.',
      'Progress to 4v2 when players are comfortable.',
    ],
    category: 'possession',
    phase: 'main',
    ageGroups: ['U8', 'U10', 'U12'],
    minPlayers: 4,
    durationMinutes: 10,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'possession-positional-play',
    name: 'Positional Play Grid',
    description:
      'Players are assigned fixed positions in a grid and must maintain their positions while keeping the ball. Forces players to think about spacing, movement within their zone, and playing through lines rather than bunching.',
    setup:
      'Mark a 30x30 yard grid divided into 9 smaller zones (3x3). Each player is assigned a zone. Play 5v5 with each player staying in their zone.',
    coachingTips: [
      'Move within your zone to create passing angles, but do not leave it.',
      'Look to play forward first, then sideways, then back.',
      'Off-the-ball movement within the zone is just as important as on-the-ball action.',
    ],
    variations: [
      'Allow one player to roam freely as a "free player."',
      'Remove the zone restriction once players understand the concept.',
      'Add goals to create a game-realistic scenario.',
    ],
    category: 'possession',
    phase: 'main',
    ageGroups: ['U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 20,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  // --- TRANSITION (4 drills) ---

  {
    id: 'transition-attack-to-defense',
    name: 'Transition: Attack to Defense',
    description:
      'When a team loses the ball, they must immediately press to win it back within 5 seconds (counter-pressing). If they fail, they drop into a compact defensive shape. Develops the crucial moment of transition.',
    setup:
      'Play 5v5 on a 30x25 yard field with mini-goals. When a team loses the ball, the coach counts to 5 out loud. If they win it back, play continues. If not, play resets.',
    coachingTips: [
      'The nearest player to the ball presses immediately - no hesitation.',
      'Surrounding players cut off passing lanes to support the press.',
      'If the press fails, the whole team drops back together within 5 seconds.',
    ],
    variations: [
      'Award bonus goals for counter-press turnovers that lead to a goal.',
      'Reduce the counter-press window to 3 seconds.',
      'Play on a larger field to make the press more difficult.',
    ],
    category: 'transition',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'transition-counter-attack',
    name: 'Counter-Attack Game',
    description:
      'Teams practice transitioning rapidly from defense to attack after winning the ball. On a turnover, the team has 8 seconds to score. Teaches quick decision-making, forward passing, and sprinting into attacking positions.',
    setup:
      'Play on half a field with a full-size goal and two mini-goals at halfway. 6v6. When the defending team wins the ball, they attack the mini-goals; when the attacking team wins it back, they attack the big goal.',
    coachingTips: [
      'First pass after winning the ball should be forward whenever possible.',
      'Sprint into wide and central positions immediately on the transition.',
      'The ball should travel faster than defenders can recover.',
    ],
    variations: [
      'Reduce the time limit to 6 seconds for more urgency.',
      'Add an offside line to make forward runs more realistic.',
      'Play directional: both teams attack the same goal and must restart after each turnover.',
    ],
    category: 'transition',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 12,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'transition-wave-attack',
    name: 'Wave Attack Drill',
    description:
      'Waves of 3 attackers launch attacks against 2 defenders plus a keeper. As soon as one wave finishes (goal or turnover), the next wave starts immediately from the other direction. Teaches quick transitions and rapid-fire attacking decisions.',
    setup:
      'Full-size goal at each end. Two groups of attackers line up at the halfway line. Two defenders per end. The first wave of 3 attacks one goal. As soon as it ends, the next wave attacks the other.',
    coachingTips: [
      'Attack with speed and urgency - the longer you take, the more defenders recover.',
      'Decide early: dribble, pass, or shoot.',
      'Defenders transition instantly from defending one wave to supporting the next.',
    ],
    variations: [
      'Allow one defender to join the next attacking wave for an overload.',
      'Increase to 4v3 waves.',
      'Start the next wave before the previous one finishes for chaos.',
    ],
    category: 'transition',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'transition-quick-restart',
    name: 'Quick Restart Game',
    description:
      'A small-sided game where the team that concedes a goal must restart play within 3 seconds from their own goal kick area. Teaches both teams to stay alert: the scoring team must press immediately, and the conceding team must reorganize quickly.',
    setup:
      'Play 5v5 on a 30x25 yard field with mini-goals. After a goal, the conceding team restarts from their goal area within 3 seconds.',
    coachingTips: [
      'After scoring, immediately press the restart to try to win the ball high.',
      'After conceding, play quickly out of the back to catch the other team unorganized.',
      'Always have a "restart plan" - know where the first pass is going before the goal is conceded.',
    ],
    variations: [
      'If the restart takes longer than 3 seconds, the scoring team gets a free shot.',
      'The restarting team must make 3 passes before crossing the halfway line.',
      'Add a "power play" rule: if you score off a quick restart, it counts as 2 goals.',
    ],
    category: 'transition',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  // --- SET PIECES (4 drills) ---

  {
    id: 'set-pieces-corner-kick-delivery',
    name: 'Corner Kick Delivery and Runs',
    description:
      'Practice corner kick delivery to specific zones (near post, far post, penalty spot, edge of area) while attackers rehearse timed runs. Establishes coordinated routines that can be executed in games.',
    setup:
      'Full-size goal with a goalkeeper. Kicker at the corner flag. 4-5 attackers and 3-4 defenders in the box. Run through planned routines.',
    coachingTips: [
      'Delivery must be consistent - aim for a specific zone every time.',
      'Runners start their movement as the kicker approaches the ball, not before.',
      'Near-post run should be aggressive and direct; far-post run times the arrival.',
    ],
    variations: [
      'Practice short corner routines.',
      'Add defensive organization (zonal vs. man-marking).',
      'Practice the outswinger and inswinger from both sides.',
    ],
    category: 'set-pieces',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 8,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'set-pieces-free-kick-shooting',
    name: 'Free Kick Shooting',
    description:
      'Players practice striking free kicks from various distances and angles. Covers technique for power shots, curling shots, and dipping shots. Includes wall setup and goalkeeper positioning.',
    setup:
      'Set up free kick positions at 20, 25, and 30 yards from goal. Create a 3-4 player wall at each position. Goalkeeper in goal.',
    coachingTips: [
      'For power: strike through the center-bottom of the ball with the laces.',
      'For curl: strike the side of the ball with the inside of the foot and follow through across the body.',
      'Pick your spot before approaching the ball - do not decide mid-run.',
    ],
    variations: [
      'Practice from different angles (central, left, right).',
      'Add a second free kick taker for short-pass options.',
      'Practice defensive wall organization from the defending side.',
    ],
    category: 'set-pieces',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals'],
  },

  {
    id: 'set-pieces-throw-in-routines',
    name: 'Throw-In Routines',
    description:
      'Practice structured throw-in routines that retain possession and create attacking opportunities. Includes short options, long throws, and movements to create space for the thrower. An overlooked area of the game that can provide a tactical edge.',
    setup:
      'Work along the sideline. Thrower with balls, 3-4 target players positioned along the line. Practice three set routines for different game situations.',
    coachingTips: [
      'Both feet must remain on the ground and the ball must be released from behind the head.',
      'Target players should make sharp checking runs to create separation from defenders.',
      'Always have a "safe" option (short, back to thrower) and an "aggressive" option (forward, down the line).',
    ],
    variations: [
      'Practice throw-ins in the defensive, middle, and attacking thirds.',
      'Add defenders to make the routines game-realistic.',
      'Practice long throw-ins to the near post (for teams with a long thrower).',
    ],
    category: 'set-pieces',
    phase: 'main',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 5,
    durationMinutes: 10,
    intensity: 'low',
    equipment: ['balls'],
  },

  {
    id: 'set-pieces-goal-kick-build-up',
    name: 'Goal Kick Build-Up Play',
    description:
      'Practice building out from goal kicks with structured patterns. The goalkeeper and defenders work on short passing options while midfielders provide support. Develops confidence playing from the back under pressure.',
    setup:
      'Goalkeeper starts with the ball. A back line of 4 and 2 central midfielders position themselves for short build-up. 3-4 pressing attackers create pressure.',
    coachingTips: [
      'Center backs split wide to create passing angles for the goalkeeper.',
      'Full backs push higher to stretch the pressing team.',
      'Have a "long" option if the short build-up is pressed successfully.',
    ],
    variations: [
      'Add more pressing players to increase difficulty.',
      'Practice with a 3-back and a 4-back shape.',
      'Allow the defending team to counter-attack if they win the ball.',
    ],
    category: 'set-pieces',
    phase: 'main',
    ageGroups: ['U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'medium',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  // ============================================================
  // SCRIMMAGE DRILLS (8 drills)
  // ============================================================

  {
    id: 'scrimmage-3v3-mini',
    name: '3v3 Mini-Goals',
    description:
      'Three versus three on a small field with mini-goals and no goalkeepers. The purest form of small-sided soccer. Maximizes touches, decisions, and engagement for every player. Ideal for younger age groups.',
    setup: 'Mark a 25x20 yard field with mini-goals (or cone goals) at each end. Two teams of 3.',
    coachingTips: [
      'Let the kids play - minimize stoppages and coaching during the game.',
      'Encourage players to solve their own problems on the field.',
      'Observe and note areas to work on in future practices.',
    ],
    variations: [
      'Add a "must complete 3 passes before shooting" rule.',
      'Play with a "bounce-back" goal (score then immediately defend).',
      'Add a neutral player for 4v3 overloads.',
    ],
    category: 'passing',
    phase: 'scrimmage',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'pinnies'],
    diagram: `G 1,0 4,0
G 6,10 9,10
P 3,3 A
P 5,5 B
P 7,3 C
D 3,7
D 5,5
D 7,7
B 5,5`,
  },

  {
    id: 'scrimmage-4v4-four-goal',
    name: '4v4 Four-Goal Game',
    description:
      'Four versus four with four mini-goals (two per team, placed on either side of their end line). Encourages switching the point of attack, awareness, and attacking from wide areas. Players must constantly scan for the open goal.',
    setup:
      'Mark a 30x25 yard field. Place two mini-goals on each end line, near the corners. Two teams of 4.',
    coachingTips: [
      'If one goal is blocked, switch to attack the other one.',
      'Spread out to create width and stretch the defense.',
      'Transition quickly - the open goal is often on the opposite side.',
    ],
    variations: [
      'Add a neutral player for overloads.',
      'Remove one goal from each side to create a standard 4v4.',
      'Award bonus points for goals scored in the wide goals.',
    ],
    category: 'attacking',
    phase: 'scrimmage',
    ageGroups: ['U8', 'U10', 'U12'],
    minPlayers: 8,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'scrimmage-5v5-line-soccer',
    name: '5v5 End Zone Game',
    description:
      'Five versus five where teams score by dribbling into an end zone (rather than shooting at a goal). Emphasizes dribbling into space, supporting runs, and controlled possession. Removes the pressure of shooting to focus on build-up play.',
    setup:
      "Mark a 40x30 yard field with 5-yard end zones at each end. Teams score by dribbling into the opponent's end zone and stopping the ball.",
    coachingTips: [
      'Look for dribbling opportunities into the end zone, not just passing.',
      'Support the ball carrier with runs to create options.',
      'The end zone is wide - attack the full width of it.',
    ],
    variations: [
      'Allow passing into the end zone for a teammate to control.',
      'Shrink the end zone to make scoring harder.',
      'Add a rule: must complete 5 passes before entering the end zone.',
    ],
    category: 'dribbling',
    phase: 'scrimmage',
    ageGroups: ['U8', 'U10', 'U12'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'scrimmage-7v7-match',
    name: '7v7 Match Play',
    description:
      'A structured 7v7 game on a reduced field with goalkeepers. Simulates the game format used in U10-U12 competitive play. Provides a full match experience while maintaining high player involvement.',
    setup:
      'Mark a 60x40 yard field with proper goals. Two teams of 7, including goalkeepers. Play two 10-minute halves.',
    coachingTips: [
      'Use a simple formation (e.g., 2-3-1 or 3-2-1) that gives structure without restricting creativity.',
      'Coach during natural stoppages, not during play.',
      'Observe individual and team behaviors to plan future sessions.',
    ],
    variations: [
      'Add conditions: must play out from the back on goal kicks.',
      'Award bonus points for goals scored from combination play.',
      'Rotate positions every 5 minutes to expose players to different roles.',
    ],
    category: 'attacking',
    phase: 'scrimmage',
    ageGroups: ['U10', 'U12', 'U14'],
    minPlayers: 14,
    durationMinutes: 25,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'scrimmage-world-cup-tournament',
    name: 'World Cup Tournament',
    description:
      'Teams of 3-4 compete in a round-robin tournament with short games (3-4 minutes each). Winners advance to a knockout round. Highly competitive and motivating for young players who love the excitement of a tournament.',
    setup:
      'Set up 2-3 small fields (20x15 yards each) with mini-goals. Divide players into teams of 3-4 and assign each team a country name.',
    coachingTips: [
      'Let the players organize themselves within their teams.',
      'Keep the games short and intense for maximum engagement.',
      'Celebrate effort and fair play, not just winning.',
    ],
    variations: [
      'Add a "golden goal" rule in the knockout round.',
      'Each team must have a different player score in each game.',
      'Allow trading of players between teams between rounds.',
    ],
    category: 'attacking',
    phase: 'scrimmage',
    ageGroups: ['U6', 'U8', 'U10', 'U12'],
    minPlayers: 12,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'pinnies'],
  },

  {
    id: 'scrimmage-conditioned-game',
    name: 'Conditioned Game',
    description:
      'A full scrimmage with specific conditions that reinforce the theme of the training session. Conditions might include touch limits, passing requirements, or scoring rules. Bridges the gap between drill work and free play.',
    setup:
      "Play on an appropriately sized field for the age group. Apply 1-2 conditions based on the day's training focus.",
    coachingTips: [
      "Choose conditions that reinforce today's theme (e.g., two-touch for a passing session, must score from a cross for a crossing session).",
      'Keep conditions simple - too many rules confuse players.',
      'Remove the conditions for the final 5 minutes to let players play freely.',
    ],
    variations: [
      'Two-touch limit to encourage quick play.',
      'Must score from inside the box (focus on attacking entries).',
      'Goals from a header or volley count double.',
    ],
    category: 'possession',
    phase: 'scrimmage',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 20,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'scrimmage-9v9-match',
    name: '9v9 Match Play',
    description:
      'A structured 9v9 game on a larger field with goalkeepers. The standard match format for U13-U14. Provides realistic tactical situations while still allowing individual player impact on the game.',
    setup:
      'Mark an 80x50 yard field with proper goals. Two teams of 9, including goalkeepers. Play two 15-minute halves.',
    coachingTips: [
      'Use a formation appropriate to the team: 3-3-2, 3-4-1, or 2-4-2.',
      'Focus on positional discipline while encouraging creative play in the final third.',
      'Make tactical adjustments at halftime based on what you observe.',
    ],
    variations: [
      'Assign specific tactical objectives to each half (e.g., press high in the first half, sit deep in the second).',
      'Rotate goalkeepers at halftime.',
      'Add a condition for the first 10 minutes, then free play.',
    ],
    category: 'attacking',
    phase: 'scrimmage',
    ageGroups: ['U12', 'U14', 'U16', 'U18'],
    minPlayers: 18,
    durationMinutes: 30,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  {
    id: 'scrimmage-numbers-up-down',
    name: 'Numbers Up/Down Game',
    description:
      'A scrimmage where the coach dynamically changes the number of players on each team by calling players on or off. Creates constantly shifting overloads and underloads, forcing players to adapt their tactics in real time.',
    setup:
      'Play on a 30x25 yard field with mini-goals. Start with equal teams. Extra players wait on the sideline, ready to join when called.',
    coachingTips: [
      'When you have numbers up, spread out and use the extra player.',
      'When numbers down, compact the space and prioritize keeping shape.',
      'React immediately to changes - the first 3 seconds after a number change are critical.',
    ],
    variations: [
      'Call "plus 2" or "minus 1" to change numbers for one team.',
      'Give the team with fewer players a specific objective (e.g., hold for 30 seconds).',
      'Both teams can go up or down at the same time.',
    ],
    category: 'transition',
    phase: 'scrimmage',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 10,
    durationMinutes: 15,
    intensity: 'high',
    equipment: ['cones', 'balls', 'goals', 'pinnies'],
  },

  // ============================================================
  // COOL-DOWN DRILLS (6 drills)
  // ============================================================

  {
    id: 'cool-down-passing-circle',
    name: 'Passing Circle',
    description:
      'Players stand in a circle and pass the ball across to each other, calling the name of the receiver before passing. A relaxed activity that maintains touches on the ball while cooling down.',
    setup: 'Players form a circle, 10-15 yards in diameter, with one ball.',
    coachingTips: [
      'Focus on clean, accurate passes with the inside of the foot.',
      'Make eye contact with the receiver before passing.',
      'Gradually reduce the pace to bring the heart rate down.',
    ],
    variations: [
      'Add a second ball for more activity.',
      'Use the outside of the foot only.',
      'Play with two touches: one to control, one to pass.',
    ],
    category: 'passing',
    phase: 'cool-down',
    ageGroups: ['U6', 'U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 6,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['balls'],
  },

  {
    id: 'cool-down-static-stretching',
    name: 'Static Stretching Routine',
    description:
      'Players go through a guided static stretching routine focusing on all major muscle groups used in soccer: quadriceps, hamstrings, calves, groin, hip flexors, and glutes. Helps with recovery and injury prevention.',
    setup:
      'Players spread out in an open area with enough space to stretch. Coach leads the routine from the front.',
    coachingTips: [
      'Hold each stretch for 20-30 seconds without bouncing.',
      'Breathe deeply and relax into each stretch.',
      'Use this time to review what was learned during the session.',
    ],
    category: 'first-touch',
    phase: 'cool-down',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 1,
    durationMinutes: 8,
    intensity: 'low',
    equipment: [],
  },

  {
    id: 'cool-down-keep-ups-challenge',
    name: 'Keep-Ups Group Challenge',
    description:
      'The team forms a circle and tries to keep the ball in the air using any body part except hands. Count consecutive touches as a team and try to beat the previous record. Fun, low-intensity, and promotes teamwork.',
    setup: 'Players form a circle, 8-10 yards in diameter. One ball.',
    coachingTips: [
      'Use a gentle touch to keep the ball at a controllable height.',
      'Communicate: call "mine!" to avoid two players going for the same ball.',
      'Celebrate team records and encourage each other.',
    ],
    category: 'first-touch',
    phase: 'cool-down',
    ageGroups: ['U8', 'U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['balls'],
  },

  {
    id: 'cool-down-soccer-bowling',
    name: 'Soccer Bowling',
    description:
      'Set up cones like bowling pins and players take turns trying to knock them down with a pass from 10-15 yards. A fun, low-pressure activity to end practice that still reinforces passing accuracy.',
    setup:
      'Set up 6-10 cones in a triangle "bowling pin" formation. Players line up 10-15 yards away with balls.',
    coachingTips: [
      'Pass with the inside of the foot for accuracy.',
      'Keep the ball on the ground.',
      'Make it competitive with scoring: 1 point per cone knocked over.',
    ],
    category: 'passing',
    phase: 'cool-down',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 2,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },

  {
    id: 'cool-down-jog-and-reflect',
    name: 'Cool-Down Jog and Reflection',
    description:
      'Players jog at a gentle pace around the perimeter of the field while the coach facilitates a group reflection. What did we learn today? What went well? What do we want to work on? Combines physical cool-down with mental processing.',
    setup:
      'Players jog in a group around the edge of the practice area. Coach jogs with them or stands in the center.',
    coachingTips: [
      'Keep the jog very light - this is about cooling down, not fitness.',
      'Ask open-ended questions to get players thinking.',
      'End on a positive note: highlight effort and improvement.',
    ],
    category: 'first-touch',
    phase: 'cool-down',
    ageGroups: ['U10', 'U12', 'U14', 'U16', 'U18'],
    minPlayers: 4,
    durationMinutes: 5,
    intensity: 'low',
    equipment: [],
  },

  {
    id: 'cool-down-fun-game',
    name: 'Fun Finish Game (Crab Soccer)',
    description:
      'Players sit on the ground and move using hands and feet (crab walk) while trying to kick a ball into a goal. A silly, low-intensity game that ends practice on a high note and keeps players excited to come back.',
    setup:
      'Mark a 15x15 yard field with two mini-goals. Two teams. Everyone must stay in the crab position (on hands and feet, belly up).',
    coachingTips: [
      'Emphasize fun over winning - this is a cool-down.',
      'Use a soft ball if available to prevent injuries from kicks while sitting.',
      'Play short rounds (2-3 minutes) and declare everyone a winner.',
    ],
    category: 'first-touch',
    phase: 'cool-down',
    ageGroups: ['U6', 'U8', 'U10'],
    minPlayers: 6,
    durationMinutes: 5,
    intensity: 'low',
    equipment: ['cones', 'balls'],
  },
];
