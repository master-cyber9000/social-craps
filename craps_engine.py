"""
Crapless Craps Engine
Full game logic including all standard bets, side bets, and the Ride with Me mechanic.
Designed to be imported into a Next.js/Supabase app or run standalone for testing.
"""

import random
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class Phase(Enum):
    COME_OUT = "come_out"
    POINT    = "point"

class BetType(Enum):
    # Core bets
    PASS_LINE    = "pass_line"
    DONT_PASS    = "dont_pass"
    COME         = "come"
    DONT_COME    = "dont_come"
    # Odds
    PASS_ODDS    = "pass_odds"
    DONT_PASS_ODDS = "dont_pass_odds"
    COME_ODDS    = "come_odds"
    DONT_COME_ODDS = "dont_come_odds"
    # Place / Buy
    PLACE_2      = "place_2"
    PLACE_3      = "place_3"
    PLACE_4      = "place_4"
    PLACE_5      = "place_5"
    PLACE_6      = "place_6"
    PLACE_8      = "place_8"
    PLACE_9      = "place_9"
    PLACE_10     = "place_10"
    PLACE_11     = "place_11"
    PLACE_12     = "place_12"
    BUY_4        = "buy_4"
    BUY_5        = "buy_5"
    BUY_6        = "buy_6"
    BUY_8        = "buy_8"
    BUY_9        = "buy_9"
    BUY_10       = "buy_10"
    # Field
    FIELD        = "field"
    # Hardways
    HARD_4       = "hard_4"
    HARD_6       = "hard_6"
    HARD_8       = "hard_8"
    HARD_10      = "hard_10"
    # One-roll proposition bets
    ANY_SEVEN    = "any_seven"
    ANY_CRAPS    = "any_craps"
    HORN         = "horn"
    HI_LO        = "hi_lo"
    WORLD        = "world"
    CE           = "ce"          # Craps/Eleven (C&E)
    ELEVEN       = "eleven"      # Yo-eleven
    TWO          = "two"         # Aces
    THREE        = "three"       # Ace-Deuce
    TWELVE       = "twelve"      # Boxcars
    # Ride with Me (social mechanic)
    RIDE         = "ride"

class BetStatus(Enum):
    ACTIVE  = "active"
    WON     = "won"
    LOST    = "lost"
    PUSHED  = "pushed"
    WORKING = "working"   # Come/DC bets travelling to a number

class Outcome(Enum):
    NATURAL          = "natural"          # 7 or 11 on come-out
    POINT_SET        = "point_set"        # New point established
    POINT_HIT        = "point_hit"        # Shooter made the point
    SEVEN_OUT        = "seven_out"        # 7 after point established
    COME_OUT_SEVEN   = "come_out_seven"   # 7 on come-out (pass wins)
    ROLL_NUMBER      = "roll_number"      # Any other number

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class Bet:
    bet_id:    str
    player_id: str
    bet_type:  BetType
    amount:    float
    status:    BetStatus = BetStatus.ACTIVE
    point:     Optional[int] = None   # For come/dont_come bets travelling to a number
    payout:    float = 0.0            # Filled in on resolution
    locked:    bool = False           # Pass/Come bets lock once point is set

@dataclass
class RollResult:
    die1:        int
    die2:        int
    total:       int
    is_hard:     bool          # Both dice same value
    outcome:     Outcome
    point_before: Optional[int]
    point_after:  Optional[int]
    resolved_bets: list = field(default_factory=list)

@dataclass
class RideLink:
    ride_id:          str
    rider_id:         str
    target_player_id: str
    initial_stake:    float
    current_value:    float
    ride_ratio:       float   # rider stake / target total bets at time of joining
    status:           str = "active"

# ---------------------------------------------------------------------------
# Payout tables
# ---------------------------------------------------------------------------

# Place bet payouts as (numerator, denominator) — payout = amount * num / den
PLACE_PAYOUTS = {
    2:  (13, 2),
    3:  (15, 4),
    4:  (9,  5),
    5:  (7,  5),
    6:  (7,  6),
    8:  (7,  6),
    9:  (7,  5),
    10: (9,  5),
    11: (15, 4),
    12: (13, 2),
}

# Buy bet payouts (true odds, 5% vig on win)
BUY_PAYOUTS = {
    4:  (2, 1),
    5:  (3, 2),
    6:  (6, 5),
    8:  (6, 5),
    9:  (3, 2),
    10: (2, 1),
}

# Odds payouts (true odds, no house edge)
ODDS_PAYOUTS = {
    4:  (2, 1),
    5:  (3, 2),
    6:  (6, 5),
    8:  (6, 5),
    9:  (3, 2),
    10: (2, 1),
    2:  (6, 1),
    3:  (3, 1),
    11: (3, 1),
    12: (6, 1),
}

# Hardways payouts
HARDWAY_PAYOUTS = {
    4:  7,
    6:  9,
    8:  9,
    10: 7,
}

# Proposition bet payouts
PROP_PAYOUTS = {
    BetType.ANY_SEVEN: 4,
    BetType.ANY_CRAPS: 7,
    BetType.ELEVEN:    15,
    BetType.TWO:       30,
    BetType.THREE:     15,
    BetType.TWELVE:    30,
}

# ---------------------------------------------------------------------------
# Dice
# ---------------------------------------------------------------------------

def roll_dice() -> tuple[int, int]:
    """Roll two six-sided dice. Returns (die1, die2)."""
    return random.randint(1, 6), random.randint(1, 6)

def is_hard(die1: int, die2: int) -> bool:
    return die1 == die2

# ---------------------------------------------------------------------------
# Core game state
# ---------------------------------------------------------------------------

class CrapsTable:
    """
    Stateless-friendly craps engine.
    All state is passed in and returned — safe for Supabase row updates.
    """

    def __init__(self):
        self.phase:   Phase        = Phase.COME_OUT
        self.point:   Optional[int] = None
        self.bets:    list[Bet]    = []
        self.players: dict         = {}   # player_id -> balance
        self.rides:   list[RideLink] = []
        self.roll_history: list[RollResult] = []

    # ------------------------------------------------------------------
    # Player management
    # ------------------------------------------------------------------

    def add_player(self, player_id: str, balance: float = 100.0):
        self.players[player_id] = balance

    def get_balance(self, player_id: str) -> float:
        return self.players.get(player_id, 0.0)

    # ------------------------------------------------------------------
    # Bet placement
    # ------------------------------------------------------------------

    def can_place_bet(self, player_id: str, bet_type: BetType, amount: float) -> tuple[bool, str]:
        """Validate a bet placement. Returns (ok, reason)."""
        balance = self.get_balance(player_id)
        if amount <= 0:
            return False, "Bet amount must be positive"
        if amount > balance:
            return False, "Insufficient balance"

        # Pass Line and Don't Pass only on come-out
        if bet_type in (BetType.PASS_LINE, BetType.DONT_PASS):
            if self.phase == Phase.POINT:
                return False, "Pass Line / Don't Pass only allowed on come-out roll"

        # Come and Don't Come only during point phase
        if bet_type in (BetType.COME, BetType.DONT_COME):
            if self.phase == Phase.COME_OUT:
                return False, "Come / Don't Come only allowed after point is set"

        # Odds bets require a base bet
        if bet_type == BetType.PASS_ODDS:
            if not any(b.bet_type == BetType.PASS_LINE and b.status == BetStatus.ACTIVE for b in self.bets if b.player_id == player_id):
                return False, "Must have Pass Line bet to take odds"
        if bet_type == BetType.DONT_PASS_ODDS:
            if not any(b.bet_type == BetType.DONT_PASS and b.status == BetStatus.ACTIVE for b in self.bets if b.player_id == player_id):
                return False, "Must have Don't Pass bet to lay odds"

        return True, "ok"

    def place_bet(self, bet_id: str, player_id: str, bet_type: BetType, amount: float) -> tuple[bool, str]:
        ok, reason = self.can_place_bet(player_id, bet_type, amount)
        if not ok:
            return False, reason
        self.players[player_id] -= amount
        self.bets.append(Bet(
            bet_id=bet_id,
            player_id=player_id,
            bet_type=bet_type,
            amount=amount,
        ))
        return True, "ok"

    def can_roll(self, shooter_id: str) -> tuple[bool, str]:
        """Shooter must have Pass Line or Don't Pass to roll."""
        has_required = any(
            b.player_id == shooter_id and
            b.bet_type in (BetType.PASS_LINE, BetType.DONT_PASS) and
            b.status == BetStatus.ACTIVE
            for b in self.bets
        )
        if not has_required:
            return False, "Shooter must place a Pass Line or Don't Pass bet before rolling"
        return True, "ok"

    # ------------------------------------------------------------------
    # Roll resolution
    # ------------------------------------------------------------------

    def roll(self, shooter_id: str, die1: Optional[int] = None, die2: Optional[int] = None) -> RollResult:
        """
        Execute a roll. Optionally pass die values for testing.
        Returns a RollResult with all resolved bets and updated state.
        """
        ok, reason = self.can_roll(shooter_id)
        if not ok:
            raise ValueError(reason)

        if die1 is None or die2 is None:
            die1, die2 = roll_dice()

        total = die1 + die2
        hard  = is_hard(die1, die2)
        point_before = self.point
        resolved: list[dict] = []

        # Determine outcome
        if self.phase == Phase.COME_OUT:
            if total in (7, 11):
                outcome = Outcome.NATURAL
            else:
                outcome = Outcome.POINT_SET
                self.point = total
                self.phase = Phase.POINT
        else:  # POINT phase
            if total == 7:
                outcome = Outcome.SEVEN_OUT
            elif total == self.point:
                outcome = Outcome.POINT_HIT
            else:
                outcome = Outcome.ROLL_NUMBER

        # Resolve all bets
        resolved += self._resolve_one_roll_bets(total, hard)
        resolved += self._resolve_hardways(total, hard, outcome)
        resolved += self._resolve_come_dont_come(total, outcome)
        resolved += self._resolve_pass_dont_pass(total, outcome)
        resolved += self._resolve_place_buy_bets(total, outcome)

        # Reset state after point hit or seven out
        if outcome in (Outcome.POINT_HIT, Outcome.SEVEN_OUT):
            self.phase = Phase.COME_OUT
            self.point = None
            # Unlock any locked bets that were resolved
            for b in self.bets:
                b.locked = False

        # Lock Pass Line and Come bets now that point is set
        if outcome == Outcome.POINT_SET:
            for b in self.bets:
                if b.player_id == shooter_id and b.bet_type == BetType.PASS_LINE and b.status == BetStatus.ACTIVE:
                    b.locked = True

        # Apply balance changes
        for r in resolved:
            if r["status"] == "won":
                self.players[r["player_id"]] += r["payout"] + r["amount"]
            # Lost bets already deducted at placement

        # Update rides
        ride_updates = self._update_rides()

        result = RollResult(
            die1=die1,
            die2=die2,
            total=total,
            is_hard=hard,
            outcome=outcome,
            point_before=point_before,
            point_after=self.point,
            resolved_bets=resolved,
        )
        self.roll_history.append(result)
        return result

    # ------------------------------------------------------------------
    # Bet resolution helpers
    # ------------------------------------------------------------------

    def _resolve_one_roll_bets(self, total: int, hard: bool) -> list[dict]:
        resolved = []
        for bet in self.bets:
            if bet.status != BetStatus.ACTIVE:
                continue

            result = None

            if bet.bet_type == BetType.FIELD:
                result = self._resolve_field(bet, total)

            elif bet.bet_type == BetType.ANY_SEVEN:
                if total == 7:
                    result = self._win(bet, PROP_PAYOUTS[BetType.ANY_SEVEN])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.ANY_CRAPS:
                if total in (2, 3, 12):
                    result = self._win(bet, PROP_PAYOUTS[BetType.ANY_CRAPS])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.ELEVEN:
                if total == 11:
                    result = self._win(bet, PROP_PAYOUTS[BetType.ELEVEN])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.TWO:
                if total == 2:
                    result = self._win(bet, PROP_PAYOUTS[BetType.TWO])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.THREE:
                if total == 3:
                    result = self._win(bet, PROP_PAYOUTS[BetType.THREE])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.TWELVE:
                if total == 12:
                    result = self._win(bet, PROP_PAYOUTS[BetType.TWELVE])
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.HORN:
                result = self._resolve_horn(bet, total)

            elif bet.bet_type == BetType.HI_LO:
                if total in (2, 12):
                    result = self._win(bet, 15)
                else:
                    result = self._lose(bet)

            elif bet.bet_type == BetType.WORLD:
                result = self._resolve_world(bet, total)

            elif bet.bet_type == BetType.CE:
                result = self._resolve_ce(bet, total)

            if result:
                resolved.append(result)

        return resolved

    def _resolve_field(self, bet: Bet, total: int) -> dict:
        if total in (3, 4, 9, 10, 11):
            return self._win(bet, 1)
        elif total == 2:
            return self._win(bet, 2)
        elif total == 12:
            return self._win(bet, 2)
        else:
            return self._lose(bet)

    def _resolve_horn(self, bet: Bet, total: int) -> dict:
        """Horn bet covers 2, 3, 11, 12. Quarter of bet on each."""
        quarter = bet.amount / 4
        if total == 2:
            net = quarter * 27 - (bet.amount - quarter)   # 30:1 on quarter, lose other three
            return self._win_net(bet, net)
        elif total == 3:
            net = quarter * 15 - (bet.amount - quarter)
            return self._win_net(bet, net)
        elif total == 11:
            net = quarter * 15 - (bet.amount - quarter)
            return self._win_net(bet, net)
        elif total == 12:
            net = quarter * 27 - (bet.amount - quarter)
            return self._win_net(bet, net)
        else:
            return self._lose(bet)

    def _resolve_world(self, bet: Bet, total: int) -> dict:
        """World (Whirl) bet covers 2, 3, 7, 11, 12."""
        fifth = bet.amount / 5
        if total == 7:
            # Push — one unit wins, four lose, net zero
            bet.status = BetStatus.PUSHED
            return {"bet_id": bet.bet_id, "player_id": bet.player_id,
                    "status": "pushed", "payout": 0, "amount": bet.amount}
        elif total in (2, 12):
            net = fifth * 26 - (bet.amount - fifth)
            return self._win_net(bet, net)
        elif total in (3, 11):
            net = fifth * 15 - (bet.amount - fifth)
            return self._win_net(bet, net)
        else:
            return self._lose(bet)

    def _resolve_ce(self, bet: Bet, total: int) -> dict:
        """C&E: half on Any Craps, half on Eleven."""
        half = bet.amount / 2
        if total in (2, 3, 12):
            net = half * 7 - half   # craps wins, eleven loses
            return self._win_net(bet, net)
        elif total == 11:
            net = half * 15 - half   # eleven wins, craps loses
            return self._win_net(bet, net)
        else:
            return self._lose(bet)

    def _resolve_hardways(self, total: int, hard: bool, outcome: Outcome) -> list[dict]:
        resolved = []
        hard_numbers = {4: BetType.HARD_4, 6: BetType.HARD_6,
                        8: BetType.HARD_8, 10: BetType.HARD_10}
        for bet in self.bets:
            if bet.status != BetStatus.ACTIVE:
                continue
            if bet.bet_type not in hard_numbers.values():
                continue
            number = {v: k for k, v in hard_numbers.items()}[bet.bet_type]
            if total == 7:
                resolved.append(self._lose(bet))
            elif total == number:
                if hard:
                    resolved.append(self._win(bet, HARDWAY_PAYOUTS[number]))
                else:
                    resolved.append(self._lose(bet))
        return resolved

    def _resolve_come_dont_come(self, total: int, outcome: Outcome) -> list[dict]:
        resolved = []
        for bet in self.bets:
            if bet.status != BetStatus.ACTIVE:
                continue

            if bet.bet_type == BetType.COME:
                if bet.point is None:
                    # Come bet just placed — establish its point
                    if total in (7, 11):
                        resolved.append(self._win(bet, 1))
                    elif total in (2, 3, 12):
                        resolved.append(self._lose(bet))
                    else:
                        bet.point = total
                        bet.status = BetStatus.WORKING
                else:
                    # Come bet travelling to its number
                    if total == bet.point:
                        resolved.append(self._win(bet, 1))
                    elif total == 7:
                        resolved.append(self._lose(bet))

            elif bet.bet_type == BetType.DONT_COME:
                if bet.point is None:
                    if total in (7, 11):
                        resolved.append(self._lose(bet))
                    elif total == 2 or total == 3:
                        resolved.append(self._win(bet, 1))
                    elif total == 12:
                        bet.status = BetStatus.PUSHED
                        resolved.append({"bet_id": bet.bet_id, "player_id": bet.player_id,
                                         "status": "pushed", "payout": 0, "amount": bet.amount})
                    else:
                        bet.point = total
                        bet.status = BetStatus.WORKING
                else:
                    if total == 7:
                        resolved.append(self._win(bet, 1))
                    elif total == bet.point:
                        resolved.append(self._lose(bet))

        return resolved

    def _resolve_pass_dont_pass(self, total: int, outcome: Outcome) -> list[dict]:
        resolved = []
        for bet in self.bets:
            if bet.status != BetStatus.ACTIVE:
                continue

            if bet.bet_type == BetType.PASS_LINE:
                if outcome == Outcome.NATURAL:
                    resolved.append(self._win(bet, 1))
                elif outcome == Outcome.SEVEN_OUT:
                    resolved.append(self._lose(bet))
                elif outcome == Outcome.POINT_HIT:
                    # Also resolve pass odds
                    resolved.append(self._win(bet, 1))
                    odds = self._find_odds_bet(bet.player_id, BetType.PASS_ODDS)
                    if odds:
                        num, den = ODDS_PAYOUTS[self.point or total]
                        resolved.append(self._win(odds, num / den))

            elif bet.bet_type == BetType.DONT_PASS:
                if outcome == Outcome.NATURAL:
                    resolved.append(self._lose(bet))
                elif outcome == Outcome.SEVEN_OUT:
                    resolved.append(self._win(bet, 1))
                    odds = self._find_odds_bet(bet.player_id, BetType.DONT_PASS_ODDS)
                    if odds:
                        num, den = ODDS_PAYOUTS[self.point or total]
                        resolved.append(self._win(odds, den / num))
                elif outcome == Outcome.POINT_HIT:
                    resolved.append(self._lose(bet))
                    odds = self._find_odds_bet(bet.player_id, BetType.DONT_PASS_ODDS)
                    if odds:
                        resolved.append(self._lose(odds))

        return resolved

    def _resolve_place_buy_bets(self, total: int, outcome: Outcome) -> list[dict]:
        resolved = []
        place_map = {
            BetType.PLACE_2: 2,  BetType.PLACE_3: 3,  BetType.PLACE_4: 4,
            BetType.PLACE_5: 5,  BetType.PLACE_6: 6,  BetType.PLACE_8: 8,
            BetType.PLACE_9: 9,  BetType.PLACE_10: 10, BetType.PLACE_11: 11,
            BetType.PLACE_12: 12,
        }
        buy_map = {
            BetType.BUY_4: 4, BetType.BUY_5: 5, BetType.BUY_6: 6,
            BetType.BUY_8: 8, BetType.BUY_9: 9, BetType.BUY_10: 10,
        }

        for bet in self.bets:
            if bet.status != BetStatus.ACTIVE:
                continue

            if bet.bet_type in place_map:
                number = place_map[bet.bet_type]
                if outcome == Outcome.SEVEN_OUT:
                    resolved.append(self._lose(bet))
                elif total == number:
                    num, den = PLACE_PAYOUTS[number]
                    resolved.append(self._win(bet, num / den))

            elif bet.bet_type in buy_map:
                number = buy_map[bet.bet_type]
                if outcome == Outcome.SEVEN_OUT:
                    resolved.append(self._lose(bet))
                elif total == number:
                    num, den = BUY_PAYOUTS[number]
                    vig = bet.amount * 0.05
                    payout = bet.amount * num / den - vig
                    resolved.append(self._win_net(bet, payout))

        return resolved

    def _find_odds_bet(self, player_id: str, bet_type: BetType) -> Optional[Bet]:
        for b in self.bets:
            if b.player_id == player_id and b.bet_type == bet_type and b.status == BetStatus.ACTIVE:
                return b
        return None

    # ------------------------------------------------------------------
    # Win / lose helpers
    # ------------------------------------------------------------------

    def _win(self, bet: Bet, multiplier: float) -> dict:
        payout = round(bet.amount * multiplier, 2)
        bet.status = BetStatus.WON
        bet.payout = payout
        self.players[bet.player_id] += payout + bet.amount
        return {"bet_id": bet.bet_id, "player_id": bet.player_id,
                "bet_type": bet.bet_type.value, "status": "won",
                "amount": bet.amount, "payout": payout}

    def _lose(self, bet: Bet) -> dict:
        bet.status = BetStatus.LOST
        bet.payout = 0
        return {"bet_id": bet.bet_id, "player_id": bet.player_id,
                "bet_type": bet.bet_type.value, "status": "lost",
                "amount": bet.amount, "payout": 0}

    def _win_net(self, bet: Bet, net_profit: float) -> dict:
        net_profit = round(net_profit, 2)
        bet.status = BetStatus.WON
        bet.payout = net_profit
        self.players[bet.player_id] += net_profit + bet.amount
        return {"bet_id": bet.bet_id, "player_id": bet.player_id,
                "bet_type": bet.bet_type.value, "status": "won",
                "amount": bet.amount, "payout": net_profit}

    # ------------------------------------------------------------------
    # Ride with Me mechanic
    # ------------------------------------------------------------------

    def start_ride(self, ride_id: str, rider_id: str, target_player_id: str, stake: float) -> tuple[bool, str]:
        """
        Rider stakes a dollar amount against the target player's current total bets.
        Ride ratio = stake / target's total active bet value.
        """
        if rider_id == target_player_id:
            return False, "Cannot ride yourself"
        if stake <= 0:
            return False, "Stake must be positive"
        if stake > self.get_balance(rider_id):
            return False, "Insufficient balance"

        target_total = self._get_total_active_bets(target_player_id)
        if target_total == 0:
            return False, "Target player has no active bets"

        ratio = stake / target_total
        self.players[rider_id] -= stake
        self.rides.append(RideLink(
            ride_id=ride_id,
            rider_id=rider_id,
            target_player_id=target_player_id,
            initial_stake=stake,
            current_value=stake,
            ride_ratio=ratio,
        ))
        return True, "ok"

    def stop_ride(self, ride_id: str) -> tuple[bool, float]:
        """Rider pulls out. Returns current ride value."""
        for ride in self.rides:
            if ride.ride_id == ride_id and ride.status == "active":
                ride.status = "stopped"
                self.players[ride.rider_id] += ride.current_value
                return True, ride.current_value
        return False, 0.0

    def _update_rides(self) -> list[dict]:
        """
        After each roll, recalculate ride values based on target player's
        current balance relative to their balance at ride start.
        Called internally after bets resolve.
        """
        updates = []
        for ride in self.rides:
            if ride.status != "active":
                continue
            target_total = self._get_total_active_bets(ride.target_player_id)
            # New ride value = initial stake * (current target total / initial target total)
            initial_target = ride.initial_stake / ride.ride_ratio
            if initial_target > 0:
                new_value = round(ride.initial_stake * (target_total / initial_target), 2)
                change = round(new_value - ride.current_value, 2)
                ride.current_value = new_value
                updates.append({
                    "ride_id": ride.ride_id,
                    "rider_id": ride.rider_id,
                    "target_player_id": ride.target_player_id,
                    "current_value": new_value,
                    "change": change,
                })
        return updates

    def notify_target_added_bets(self, ride_id: str, amount_added: float) -> dict:
        """
        Called when target player adds new bets.
        Returns a prompt for the rider: keep riding or add proportionally.
        """
        for ride in self.rides:
            if ride.ride_id == ride_id and ride.status == "active":
                proportional_add = round(amount_added * ride.ride_ratio, 2)
                return {
                    "ride_id": ride_id,
                    "rider_id": ride.rider_id,
                    "message": f"Target added ${amount_added:.2f}. Add ${proportional_add:.2f} to keep ratio?",
                    "proportional_add": proportional_add,
                }
        return {}

    def rider_add_to_ride(self, ride_id: str, amount: float) -> tuple[bool, str]:
        """Rider opts to add proportionally when target adds bets."""
        for ride in self.rides:
            if ride.ride_id == ride_id and ride.status == "active":
                if amount > self.get_balance(ride.rider_id):
                    return False, "Insufficient balance"
                self.players[ride.rider_id] -= amount
                ride.initial_stake += amount
                ride.current_value += amount
                return True, "ok"
        return False, "Ride not found"

    def _get_total_active_bets(self, player_id: str) -> float:
        return sum(
            b.amount for b in self.bets
            if b.player_id == player_id and b.status in (BetStatus.ACTIVE, BetStatus.WORKING)
        )

    # ------------------------------------------------------------------
    # Session summary (for Close Out card)
    # ------------------------------------------------------------------

    def get_session_summary(self, player_id: str, starting_balance: float = 100.0) -> dict:
        current_balance = self.get_balance(player_id)
        net = round(current_balance - starting_balance, 2)
        player_bets = [b for b in self.bets if b.player_id == player_id]
        wins  = [b for b in player_bets if b.status == BetStatus.WON]
        losses= [b for b in player_bets if b.status == BetStatus.LOST]
        seven_outs = sum(1 for r in self.roll_history if r.outcome == Outcome.SEVEN_OUT)
        biggest_win = max((b.payout for b in wins), default=0)
        rides_as_rider = [r for r in self.rides if r.rider_id == player_id]
        rides_as_target= [r for r in self.rides if r.target_player_id == player_id]

        return {
            "player_id":         player_id,
            "net":               net,
            "result":            "win" if net >= 0 else "loss",
            "total_rolls":       len(self.roll_history),
            "total_bets_placed": len(player_bets),
            "wins":              len(wins),
            "losses":            len(losses),
            "biggest_win":       biggest_win,
            "seven_outs":        seven_outs,
            "rides_taken":       len(rides_as_rider),
            "riders_on_you":     len(rides_as_target),
            "current_balance":   current_balance,
        }


# ---------------------------------------------------------------------------
# Quick test / demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== Crapless Craps Engine Test ===\n")

    table = CrapsTable()
    table.add_player("jose",  100.0)
    table.add_player("rider", 50.0)

    # Place pass line bet
    table.place_bet("b1", "jose", BetType.PASS_LINE, 10.0)
    table.place_bet("b2", "jose", BetType.FIELD, 5.0)
    print(f"Jose balance after bets: ${table.get_balance('jose'):.2f}")

    # Rider starts riding Jose
    ok, msg = table.start_ride("r1", "rider", "jose", 5.0)
    print(f"Ride started: {ok} — {msg}")
    print(f"Rider balance after ride: ${table.get_balance('rider'):.2f}")

    # Force a come-out roll of 7 (natural win)
    result = table.roll("jose", die1=3, die2=4)
    print(f"\nRoll: {result.die1}+{result.die2}={result.total} — {result.outcome.value}")
    for r in result.resolved_bets:
        print(f"  {r['bet_type']}: {r['status']} — payout ${r['payout']:.2f}")
    print(f"Jose balance: ${table.get_balance('jose'):.2f}")

    # New round — place pass line, then set a point
    table.place_bet("b3", "jose", BetType.PASS_LINE, 10.0)
    table.place_bet("b4", "jose", BetType.PLACE_6, 12.0)
    result = table.roll("jose", die1=2, die2=4)   # rolls 6 — point set
    print(f"\nRoll: {result.die1}+{result.die2}={result.total} — {result.outcome.value}")
    print(f"Point set to: {table.point}")

    # Roll the point
    result = table.roll("jose", die1=3, die2=3)   # hard 6 — point hit
    print(f"\nRoll: {result.die1}+{result.die2}={result.total} — {result.outcome.value} (hard: {result.is_hard})")
    for r in result.resolved_bets:
        print(f"  {r['bet_type']}: {r['status']} — payout ${r['payout']:.2f}")
    print(f"Jose balance: ${table.get_balance('jose'):.2f}")
    print(f"Rider value: ${table.rides[0].current_value:.2f}")

    # Session summary
    print("\n=== Session Summary ===")
    summary = table.get_session_summary("jose")
    for k, v in summary.items():
        print(f"  {k}: {v}")
