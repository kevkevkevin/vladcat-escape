// scripts/expTable.js
{

const C3 = self.C3;

function unaryminus(n)
{
	return (typeof n === "number" ? -n : n);
}

function bothNumbers(a, b)
{
	return typeof a === "number" && typeof b === "number";
}

function add(l, r)
{
	if (bothNumbers(l, r))
		return l + r;
	else
		return l;
}

function subtract(l, r)
{
	if (bothNumbers(l, r))
		return l - r;
	else
		return l;
}

function multiply(l, r)
{
	if (bothNumbers(l, r))
		return l * r;
	else
		return l;
}

function divide(l, r)
{
	if (bothNumbers(l, r))
		return l / r;
	else
		return l;
}

function mod(l, r)
{
	if (bothNumbers(l, r))
		return l % r;
	else
		return l;
}

function pow(l, r)
{
	if (bothNumbers(l, r))
		return Math.pow(l, r);
	else
		return l;
}

function and(l, r)
{
	if (typeof l === "string" || typeof r === "string")
	{
		// & with either side string does string concatenation
		let lstr, rstr;

		if (typeof l === "number")
			lstr = (Math.round(l * 1e10) / 1e10).toString();
		else
			lstr = l;
		
		if (typeof r === "number")
			rstr = (Math.round(r * 1e10) / 1e10).toString();
		else
			rstr = r;
		
		return lstr + rstr;
	}
	else
	{
		// & with neither side a string does logical AND
		return (l && r ? 1 : 0);
	}
}

function or(l, r)
{
	if (bothNumbers(l, r))
		return (l || r ? 1 : 0);
	else
		return l;
}

self.C3_ExpressionFuncs = [
		/* expression 0 */ () => "",
		/* expression 1 */ () => 228,
		/* expression 2 */ () => 8,
		/* expression 3 */ () => 1,
		/* expression 4 */ () => 0,
		/* expression 5 */ () => "x",
		/* expression 6 */ () => 12,
		/* expression 7 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			return () => ((f0("x") * 30) + 15);
		},
		/* expression 8 */ () => "Fade",
		/* expression 9 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			return () => (f0("x") * 0.05);
		},
		/* expression 10 */ () => "out",
		/* expression 11 */ () => 0.25,
		/* expression 12 */ () => 15,
		/* expression 13 */ () => "Player Input Desktop",
		/* expression 14 */ () => "Player Input Mobile",
		/* expression 15 */ () => 16,
		/* expression 16 */ () => 22,
		/* expression 17 */ () => "Up",
		/* expression 18 */ () => 88,
		/* expression 19 */ () => 4,
		/* expression 20 */ () => 24,
		/* expression 21 */ () => 25,
		/* expression 22 */ () => 26,
		/* expression 23 */ () => 500,
		/* expression 24 */ () => 27,
		/* expression 25 */ () => 32,
		/* expression 26 */ () => 0.2,
		/* expression 27 */ () => 34,
		/* expression 28 */ () => "Game",
		/* expression 29 */ () => 180,
		/* expression 30 */ () => 37,
		/* expression 31 */ () => 48,
		/* expression 32 */ p => {
			const v0 = p._GetNode(0).GetVar();
			return () => ("CLANK WORLD SAVED!\nThank you for helping me, " + (v0.GetValue() || "escape artist") + "!\nPlease share it on X and you will receive your reward.");
		},
		/* expression 33 */ () => "Music_Level",
		/* expression 34 */ () => -15,
		/* expression 35 */ () => "Desktop",
		/* expression 36 */ () => "Mobile",
		/* expression 37 */ () => "Touch Screen",
		/* expression 38 */ () => "Input Desktop",
		/* expression 39 */ () => "Input Mobile",
		/* expression 40 */ p => {
			const n0 = p._GetNode(0);
			return () => n0.ExpObject();
		},
		/* expression 41 */ () => 28,
		/* expression 42 */ p => {
			const n0 = p._GetNode(0);
			const f1 = p._GetNode(1).GetBoundMethod();
			return () => C3.lerp(n0.ExpObject(), 0, (3 * f1()));
		},
		/* expression 43 */ () => "Right",
		/* expression 44 */ () => "Left",
		/* expression 45 */ () => "Player Input Desktop (Level 15)",
		/* expression 46 */ () => "Player Input Desktop (Level 27)",
		/* expression 47 */ () => "Button_A",
		/* expression 48 */ () => "Player Input Mobile  (level 15)",
		/* expression 49 */ () => "Player Input Mobile (Level 27)",
		/* expression 50 */ () => "Player Functions",
		/* expression 51 */ () => -5,
		/* expression 52 */ p => {
			const n0 = p._GetNode(0);
			return () => (n0.ExpBehavior() / 1.5);
		},
		/* expression 53 */ () => "gro_animation",
		/* expression 54 */ () => "Run",
		/* expression 55 */ () => "Idle",
		/* expression 56 */ () => "Jump",
		/* expression 57 */ () => "Fall",
		/* expression 58 */ () => 6,
		/* expression 59 */ () => 11,
		/* expression 60 */ () => 13,
		/* expression 61 */ () => 19,
		/* expression 62 */ () => 20,
		/* expression 63 */ () => 21,
		/* expression 64 */ () => 23,
		/* expression 65 */ () => 30,
		/* expression 66 */ () => 31,
		/* expression 67 */ () => 33,
		/* expression 68 */ () => 35,
		/* expression 69 */ () => 36,
		/* expression 70 */ () => 39,
		/* expression 71 */ () => 43,
		/* expression 72 */ () => 46,
		/* expression 73 */ () => 2,
		/* expression 74 */ () => 3,
		/* expression 75 */ () => 5,
		/* expression 76 */ () => 128,
		/* expression 77 */ () => 7,
		/* expression 78 */ () => "Real",
		/* expression 79 */ () => 38,
		/* expression 80 */ () => 41,
		/* expression 81 */ () => 14,
		/* expression 82 */ () => "Spawner_Effect",
		/* expression 83 */ () => "y",
		/* expression 84 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			return () => ((f0("y") * 30) - 15);
		},
		/* expression 85 */ () => "in",
		/* expression 86 */ () => 60,
		/* expression 87 */ () => 0.75,
		/* expression 88 */ () => 9,
		/* expression 89 */ () => 10,
		/* expression 90 */ () => 18,
		/* expression 91 */ () => 29,
		/* expression 92 */ () => 100,
		/* expression 93 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			const f1 = p._GetNode(1).GetBoundMethod();
			return () => f0(f1(0));
		},
		/* expression 94 */ () => -32,
		/* expression 95 */ () => 232,
		/* expression 96 */ () => "Spawner_effect",
		/* expression 97 */ () => 40,
		/* expression 98 */ () => "huds",
		/* expression 99 */ () => "lay_hud",
		/* expression 100 */ () => "In",
		/* expression 101 */ () => 70,
		/* expression 102 */ () => 108,
		/* expression 103 */ () => 0.1,
		/* expression 104 */ () => 0.3,
		/* expression 105 */ () => 284,
		/* expression 106 */ () => 0.95,
		/* expression 107 */ () => 0.05,
		/* expression 108 */ () => "Menu",
		/* expression 109 */ p => {
			const v0 = p._GetNode(0).GetVar();
			return () => and("Level_", v0.GetValue());
		},
		/* expression 110 */ () => 42,
		/* expression 111 */ () => 45,
		/* expression 112 */ () => 47,
		/* expression 113 */ () => "sound",
		/* expression 114 */ () => "music",
		/* expression 115 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			return () => f0();
		},
		/* expression 116 */ p => {
			const v0 = p._GetNode(0).GetVar();
			return () => v0.GetValue();
		},
		/* expression 117 */ () => "Music_level",
		/* expression 118 */ () => "width",
		/* expression 119 */ () => "150px",
		/* expression 120 */ () => "height",
		/* expression 121 */ () => "30px",
		/* expression 122 */ () => "border",
		/* expression 123 */ () => "2px solid orange",
		/* expression 124 */ () => "border-radius",
		/* expression 125 */ () => "10px",
		/* expression 126 */ () => "padding-left",
		/* expression 127 */ () => "padding-right",
		/* expression 128 */ () => "font-size",
		/* expression 129 */ () => "15px",
		/* expression 130 */ () => "text-align",
		/* expression 131 */ () => "center",
		/* expression 132 */ () => 681214,
		/* expression 133 */ p => {
			const f0 = p._GetNode(0).GetBoundMethod();
			return () => f0(255, 255, 255, 255);
		},
		/* expression 134 */ () => "Start Menu",
		/* expression 135 */ () => Infinity,
		/* expression 136 */ () => "Level",
		/* expression 137 */ () => "Scene",
		/* expression 138 */ p => {
			const level = p._GetNode(0).GetVar();
			return () => { self.EcodroidsTiming?.completeStage(level.GetValue()); return 1; };
		}
];


}
