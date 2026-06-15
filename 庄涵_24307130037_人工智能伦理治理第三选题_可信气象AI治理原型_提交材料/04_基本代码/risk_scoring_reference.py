"""Risk scoring reference for the trustworthy meteorological AI prototype.

This file documents the core rule-based governance logic used by the
frontend risk calculator. It does not generate PDF files and does not depend
on the original model weights or satellite data.
"""

from __future__ import annotations

from dataclasses import dataclass


CHANNEL_BASE_RISK = {
    "CH09": 8,
    "CH10": 12,
    "CH12": 32,
    "CH13": 34,
}


@dataclass(frozen=True)
class RiskInput:
    channel: str
    min_brightness_temperature_k: int
    cloud_structure: str  # smooth, edge, rapid
    use_context: str  # research, assist, warning
    out_of_distribution: bool = False
    data_quality_issue: bool = False


def classify_risk(score: int) -> str:
    if score >= 78:
        return "extreme"
    if score >= 55:
        return "high"
    if score >= 32:
        return "medium"
    return "low"


def governance_actions(level: str, context: str) -> list[str]:
    base = ["记录模型版本、数据时间、预测通道和风险规则。"]
    if level == "low":
        return base + ["可作为短时趋势参考, 仍需与实况资料对照。"]
    if level == "medium":
        return base + ["查看误差图和亮温分箱误差, 不得只依据预测图判断。"]
    if level == "high":
        action = "不得由模型单独形成预警结论。" if context == "warning" else "不得表述为确定性结论。"
        return base + ["必须人工复核。", "结合雷达、地面观测、数值预报或相邻时次云图。", action]
    return base + ["暂不建议用于决策。", "必须多源核验和人工复核。", "禁止模型自动触发灾害预警或应急响应建议。"]


def score_risk(risk_input: RiskInput) -> tuple[int, str, list[str]]:
    if risk_input.channel not in CHANNEL_BASE_RISK:
        raise ValueError(f"Unknown channel: {risk_input.channel}")

    score = CHANNEL_BASE_RISK[risk_input.channel]
    bt = risk_input.min_brightness_temperature_k

    if bt < 200:
        score += 30
    elif bt < 220:
        score += 22
    elif bt < 240:
        score += 10

    if risk_input.cloud_structure == "edge":
        score += 14
    elif risk_input.cloud_structure == "rapid":
        score += 22

    if risk_input.use_context == "assist":
        score += 8
    elif risk_input.use_context == "warning":
        score += 24

    if risk_input.out_of_distribution:
        score += 18
    if risk_input.data_quality_issue:
        score += 20

    score = min(score, 100)
    level = classify_risk(score)
    return score, level, governance_actions(level, risk_input.use_context)


if __name__ == "__main__":
    example = RiskInput(
        channel="CH13",
        min_brightness_temperature_k=180,
        cloud_structure="edge",
        use_context="warning",
    )
    risk_score, risk_level, actions = score_risk(example)
    print("risk_score:", risk_score)
    print("risk_level:", risk_level)
    print("governance_actions:")
    for action in actions:
        print("-", action)
