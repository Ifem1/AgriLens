import type { WeatherSnapshot, ValidatorVote } from "@/types/database";

interface RiskInputs {
  validatorVotes: ValidatorVote[];
  weather: WeatherSnapshot | null;
  cropStage: string;
  treatmentChemicalRisk: number;
  historicalAccuracy: number;
}

export function calculateRiskScore(inputs: RiskInputs): number {
  const { validatorVotes, weather, cropStage, treatmentChemicalRisk, historicalAccuracy } = inputs;

  const totalVotes = validatorVotes.length;
  const topVote = validatorVotes[0]?.vote;
  const agreementCount = validatorVotes.filter((v) => v.vote === topVote).length;
  const agreementPct = totalVotes > 0 ? (agreementCount / totalVotes) * 100 : 0;
  const validatorScore = 100 - agreementPct;

  const weatherRisk = weather
    ? Math.min(100, (weather.rain_probability * 0.4) + (weather.wind_speed * 1.5) + (Math.abs(weather.temperature - 25) * 0.5))
    : 50;

  const vulnerableStages = ["flowering", "seedling"];
  const cropStageRisk = vulnerableStages.includes(cropStage) ? 70 : 30;

  const chemicalRisk = Math.min(100, treatmentChemicalRisk);

  const accuracyRisk = 100 - historicalAccuracy;

  const score =
    validatorScore * 0.35 +
    weatherRisk * 0.20 +
    cropStageRisk * 0.20 +
    chemicalRisk * 0.15 +
    accuracyRisk * 0.10;

  return Math.round(Math.min(100, Math.max(0, score)));
}

export function getRiskLabel(score: number): { label: string; color: string } {
  if (score < 40) return { label: "Low Risk", color: "text-green-400" };
  if (score < 70) return { label: "Medium Risk", color: "text-yellow-400" };
  return { label: "High Risk", color: "text-red-400" };
}
