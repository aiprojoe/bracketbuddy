import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { SEED_PAIRS_R64, type Region, type Round } from "../../../shared/bracketData";

const REGIONS: Region[] = ["East", "West", "South", "Midwest"];
const ROUNDS: Round[] = ["round64", "round32", "sweet16", "elite8"];
const ROUND_LABELS: Record<string, string> = {
  round64: "R64",
  round32: "R32",
  sweet16: "S16",
  elite8: "E8",
  finalfour: "FF",
  championship: "Champ",
};

type PicksMap = Record<string, number>;

function getMatchupId(region: string, round: string, slot: number) {
  return `${region}-${round}-${slot}`;
}

function PrintTeamSlot({
  seed,
  name,
  picked,
  color,
}: {
  seed?: number;
  name?: string;
  picked?: boolean;
  color?: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 4px",
        borderBottom: "1px solid #ccc",
        backgroundColor: picked ? "#fff3cd" : "white",
        minHeight: "20px",
        fontSize: "9px",
      }}
    >
      {seed !== undefined ? (
        <>
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "3px",
              backgroundColor: color ?? "#666",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "8px",
              fontWeight: "bold",
              flexShrink: 0,
            }}
          >
            {seed}
          </span>
          <span style={{ fontWeight: picked ? "bold" : "normal", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {name ?? "TBD"}
          </span>
          {picked && <span style={{ color: "#e65c00", fontWeight: "bold", fontSize: "8px" }}>✓</span>}
        </>
      ) : (
        <span style={{ color: "#aaa" }}>TBD</span>
      )}
    </div>
  );
}

function PrintMatchup({
  team1Seed,
  team1Name,
  team1Color,
  team2Seed,
  team2Name,
  team2Color,
  pickedTeamId,
  team1Id,
  team2Id,
}: {
  team1Seed?: number;
  team1Name?: string;
  team1Color?: string | null;
  team2Seed?: number;
  team2Name?: string;
  team2Color?: string | null;
  pickedTeamId?: number;
  team1Id?: number;
  team2Id?: number;
}) {
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: "3px", overflow: "hidden", marginBottom: "2px", width: "120px" }}>
      <PrintTeamSlot seed={team1Seed} name={team1Name} color={team1Color} picked={pickedTeamId === team1Id} />
      <PrintTeamSlot seed={team2Seed} name={team2Name} color={team2Color} picked={pickedTeamId === team2Id} />
    </div>
  );
}

export default function PrintBracket() {
  const { data: teamsData } = trpc.teams.getAll.useQuery();
  const { data: bracketData } = trpc.bracket.getMine.useQuery(undefined, { retry: false });

  const teams = teamsData ?? [];
  const picks: PicksMap = {};
  bracketData?.picks.forEach((p) => {
    picks[p.matchupId] = p.pickedTeamId;
  });

  const getTeamBySeed = (region: Region, seed: number) =>
    teams.find((t) => t.region === region && t.seed === seed);

  type MatchupEntry = { id: string; team1: ReturnType<typeof getTeamBySeed>; team2: ReturnType<typeof getTeamBySeed> };

  const getMatchupsForRound = (region: Region, round: Round): MatchupEntry[] => {
    if (round === "round64") {
      return SEED_PAIRS_R64.map(([s1, s2], i) => ({
        id: getMatchupId(region, round, i),
        team1: getTeamBySeed(region, s1),
        team2: getTeamBySeed(region, s2),
      }));
    }
    const prevRound = ROUNDS[ROUNDS.indexOf(round) - 1];
    if (!prevRound) return [];
    const prevMatchups = getMatchupsForRound(region, prevRound);
    const result: MatchupEntry[] = [];
    for (let i = 0; i < prevMatchups.length; i += 2) {
      const m1: MatchupEntry | undefined = prevMatchups[i];
      const m2: MatchupEntry | undefined = prevMatchups[i + 1];
      if (!m1 || !m2) break;
      const winner1Id: number | undefined = picks[m1.id];
      const winner2Id: number | undefined = picks[m2.id];
      const winner1 = winner1Id ? teams.find((t) => t.id === winner1Id) : undefined;
      const winner2 = winner2Id ? teams.find((t) => t.id === winner2Id) : undefined;
      result.push({
        id: getMatchupId(region, round, Math.floor(i / 2)),
        team1: winner1,
        team2: winner2,
      });
    }
    return result;
  };

  // Final Four
  const elite8Winners = REGIONS.map((region) => {
    const e8 = getMatchupsForRound(region, "elite8");
    const m = e8[0];
    if (!m) return undefined;
    const wId = picks[m.id];
    return wId ? teams.find((t) => t.id === wId) : undefined;
  });

  const ffMatchups = [
    { id: "FinalFour-0", team1: elite8Winners[0], team2: elite8Winners[1] }, // East vs West
    { id: "FinalFour-1", team1: elite8Winners[2], team2: elite8Winners[3] }, // South vs Midwest
  ];

  const champTeam1Id = picks["FinalFour-0"];
  const champTeam2Id = picks["FinalFour-1"];
  const champTeam1 = champTeam1Id ? teams.find((t) => t.id === champTeam1Id) : undefined;
  const champTeam2 = champTeam2Id ? teams.find((t) => t.id === champTeam2Id) : undefined;
  const champWinnerId = picks["Championship-0"];
  const champion = champWinnerId ? teams.find((t) => t.id === champWinnerId) : undefined;

  useEffect(() => {
    if (teamsData) {
      setTimeout(() => window.print(), 800);
    }
  }, [teamsData]);

  const userName = bracketData?.bracket ? "My Bracket" : "BracketBuddy 2026";

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        backgroundColor: "white",
        color: "black",
        padding: "16px",
        maxWidth: "1100px",
        margin: "0 auto",
      }}
    >
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: landscape; margin: 8mm; }
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body { background: white; }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "2px solid #e65c00", paddingBottom: "8px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "900", letterSpacing: "-0.5px" }}>
            <span style={{ color: "#e65c00" }}>BRACKET</span>BUDDY
          </h1>
          <p style={{ margin: 0, fontSize: "10px", color: "#666" }}>2026 NCAA Men's Basketball Tournament</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold" }}>{userName}</div>
          <div style={{ fontSize: "9px", color: "#888" }}>bracketbuddy.unrivaledbusinesssolutions.com</div>
        </div>
      </div>

      {/* 4 Regions in 2x2 grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        {REGIONS.map((region) => (
          <div key={region} style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "8px" }}>
            <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", color: "#e65c00" }}>
              {region} Region
            </div>
            <div style={{ display: "flex", gap: "4px", alignItems: "flex-start" }}>
              {ROUNDS.map((round) => {
                const matchups = getMatchupsForRound(region, round);
                return (
                  <div key={round}>
                    <div style={{ fontSize: "7px", textAlign: "center", color: "#888", marginBottom: "2px", textTransform: "uppercase" }}>
                      {ROUND_LABELS[round]}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: round === "round64" ? "2px" : round === "round32" ? "24px" : round === "sweet16" ? "62px" : "140px",
                        paddingTop: round === "round64" ? 0 : round === "round32" ? "12px" : round === "sweet16" ? "32px" : "72px",
                      }}
                    >
                      {matchups.map((m) => (
                        <PrintMatchup
                          key={m.id}
                          team1Seed={m.team1?.seed}
                          team1Name={m.team1?.shortName}
                          team1Color={m.team1?.color}
                          team1Id={m.team1?.id}
                          team2Seed={m.team2?.seed}
                          team2Name={m.team2?.shortName}
                          team2Color={m.team2?.color}
                          team2Id={m.team2?.id}
                          pickedTeamId={picks[m.id]}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {/* Region winner */}
              <div>
                <div style={{ fontSize: "7px", textAlign: "center", color: "#e65c00", marginBottom: "2px", textTransform: "uppercase" }}>Winner</div>
                <div style={{ paddingTop: "140px" }}>
                  {(() => {
                    const e8 = getMatchupsForRound(region, "elite8");
                    const m = e8[0];
                    if (!m) return null;
                    const wId = picks[m?.id ?? ""];
                    const winner = wId ? teams.find((t) => t.id === wId) : undefined;
                    return (
                      <div style={{ width: "80px", border: "1px solid #e65c00", borderRadius: "3px", padding: "4px", backgroundColor: "#fff3cd", textAlign: "center" }}>
                        {winner ? (
                          <>
                            <div style={{ fontSize: "8px", fontWeight: "bold" }}>#{winner.seed}</div>
                            <div style={{ fontSize: "9px", fontWeight: "bold", color: "#e65c00" }}>{winner.shortName}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: "8px", color: "#aaa" }}>TBD</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Final Four + Championship */}
      <div style={{ border: "1px solid #e0e0e0", borderRadius: "6px", padding: "8px" }}>
        <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px", color: "#e65c00" }}>
          🏆 Final Four & Championship
        </div>
        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          {/* Final Four */}
          <div>
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "4px", textTransform: "uppercase" }}>Final Four</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {ffMatchups.map((m, i) => (
                <div key={m.id}>
                  <div style={{ fontSize: "7px", color: "#aaa", marginBottom: "2px" }}>
                    {i === 0 ? "East vs West" : "South vs Midwest"}
                  </div>
                  <PrintMatchup
                    team1Seed={m.team1?.seed}
                    team1Name={m.team1?.shortName}
                    team1Color={m.team1?.color}
                    team1Id={m.team1?.id}
                    team2Seed={m.team2?.seed}
                    team2Name={m.team2?.shortName}
                    team2Color={m.team2?.color}
                    team2Id={m.team2?.id}
                    pickedTeamId={picks[m.id]}
                  />
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: "16px", color: "#ccc" }}>→</div>

          {/* Championship */}
          <div>
            <div style={{ fontSize: "8px", color: "#888", marginBottom: "4px", textTransform: "uppercase" }}>Championship</div>
            <PrintMatchup
              team1Seed={champTeam1?.seed}
              team1Name={champTeam1?.shortName}
              team1Color={champTeam1?.color}
              team1Id={champTeam1?.id}
              team2Seed={champTeam2?.seed}
              team2Name={champTeam2?.shortName}
              team2Color={champTeam2?.color}
              team2Id={champTeam2?.id}
              pickedTeamId={picks["Championship-0"]}
            />
          </div>

          <div style={{ fontSize: "16px", color: "#ccc" }}>→</div>

          {/* Champion */}
          <div>
            <div style={{ fontSize: "8px", color: "#e65c00", marginBottom: "4px", textTransform: "uppercase" }}>👑 National Champion</div>
            <div style={{ width: "100px", border: "2px solid #e65c00", borderRadius: "6px", padding: "8px", backgroundColor: "#fff8f0", textAlign: "center" }}>
              {champion ? (
                <>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      backgroundColor: champion.color ?? "#666",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "10px",
                      fontWeight: "bold",
                      margin: "0 auto 4px",
                    }}
                  >
                    {champion.seed}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "bold", color: "#e65c00" }}>{champion.shortName}</div>
                  <div style={{ fontSize: "8px", color: "#888" }}>{champion.conference}</div>
                  <div style={{ fontSize: "8px", color: "#e65c00", marginTop: "2px" }}>320 pts</div>
                </>
              ) : (
                <div style={{ fontSize: "9px", color: "#aaa" }}>Make your picks!</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "8px", fontSize: "8px", color: "#aaa", textAlign: "center" }}>
        Printed from BracketBuddy · bracketbuddy.unrivaledbusinesssolutions.com · 2026 NCAA Tournament · Highlighted picks = your selections
      </div>

      {/* Print button (hidden when printing) */}
      <div className="no-print" style={{ position: "fixed", top: "16px", right: "16px", display: "flex", gap: "8px" }}>
        <button
          onClick={() => window.print()}
          style={{ padding: "8px 16px", backgroundColor: "#e65c00", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}
        >
          🖨️ Print
        </button>
        <button
          onClick={() => window.history.back()}
          style={{ padding: "8px 16px", backgroundColor: "#333", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
