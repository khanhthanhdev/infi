use crate::domain::{
    Analysis, AnalysisIntent, AnalysisReport, PortfolioDetail, RunContext,
    portfolio_holding_entity_id,
};
use crate::infra::db::Database;
use handlebars::Handlebars;
use serde::Serialize;
use serde_json::{Value, json};
use std::collections::HashSet;

#[derive(Debug, Clone, Serialize)]
pub struct ExplanationTarget {
    pub target_type: String,
    pub target_key: String,
    pub display_name: String,
    pub metric_name: String,
    pub value: Option<f64>,
    pub unit: Option<String>,
    pub as_of: Option<String>,
}

const FINANCE_TERMS: &[(&str, &[&str])] = &[
    (
        "pe",
        &["P/E", "P/E ratio", "price to earnings", "price-to-earnings"],
    ),
    ("casa", &["CASA", "CASA ratio"]),
    ("eps", &["EPS", "earnings per share"]),
    ("roe", &["ROE", "return on equity"]),
    ("roa", &["ROA", "return on assets"]),
    ("ebitda", &["EBITDA"]),
    ("nim", &["NIM", "net interest margin"]),
    ("revenue", &["revenue", "sales"]),
    ("gross_margin", &["gross margin"]),
    ("operating_margin", &["operating margin"]),
    ("net_margin", &["net margin"]),
    ("free_cash_flow", &["free cash flow", "FCF"]),
    ("dividend_yield", &["dividend yield"]),
    ("book_value", &["book value"]),
    ("market_cap", &["market cap", "market capitalization"]),
    ("ev_ebitda", &["EV/EBITDA"]),
    ("debt_to_equity", &["debt-to-equity", "debt to equity"]),
    (
        "loan_to_deposit",
        &["loan-to-deposit", "loan to deposit", "LDR"],
    ),
    ("non_performing_loan", &["non-performing loan", "NPL"]),
    ("net_profit", &["net profit", "net income"]),
];

pub fn build_explanation_prompt(
    run: &RunContext,
    targets: &[ExplanationTarget],
) -> anyhow::Result<String> {
    let template = include_str!("explanation_prompt.hbs");
    let handlebars = Handlebars::new();

    let targets_json: Vec<Value> = targets
        .iter()
        .map(|target| {
            json!({
                "target_type": target.target_type,
                "target_key": target.target_key,
                "display_name": target.display_name,
                "metric_name": target.metric_name,
                "numeric_value": target.value,
                "unit": target.unit,
                "as_of": target.as_of,
            })
        })
        .collect();

    handlebars
        .render_template(
            template,
            &json!({
                "analysis_id": run.analysis_id,
                "run_id": run.run_id,
                "user_prompt": run.user_prompt,
                "targets": targets_json,
            }),
        )
        .map_err(Into::into)
}

#[must_use]
pub fn explanation_targets_from_report(report: &AnalysisReport) -> Vec<ExplanationTarget> {
    let mut seen = HashSet::new();
    let mut targets = Vec::new();

    for metric in &report.metrics {
        let target_key = normalize_explanation_key(&metric.metric);
        if seen.insert(("metric".to_string(), target_key.clone())) {
            targets.push(ExplanationTarget {
                target_type: "metric".to_string(),
                target_key,
                display_name: metric.metric.replace('_', " "),
                metric_name: metric.metric.clone(),
                value: Some(metric.numeric_value),
                unit: metric.unit.clone(),
                as_of: Some(metric.as_of.clone()),
            });
        }
    }

    let body = report
        .blocks
        .iter()
        .map(|block| block.body.as_str())
        .collect::<Vec<_>>()
        .join("\n");
    let body_lower = body.to_ascii_lowercase();

    for (key, aliases) in FINANCE_TERMS {
        if aliases
            .iter()
            .any(|alias| body_lower.contains(&alias.to_ascii_lowercase()))
            && seen.insert(("term".to_string(), (*key).to_string()))
        {
            targets.push(ExplanationTarget {
                target_type: "term".to_string(),
                target_key: (*key).to_string(),
                display_name: aliases[0].to_string(),
                metric_name: aliases[0].to_string(),
                value: None,
                unit: None,
                as_of: None,
            });
        }
    }

    targets
}

#[must_use]
pub fn normalize_explanation_key(value: &str) -> String {
    value
        .trim()
        .to_ascii_lowercase()
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() { ch } else { '_' })
        .collect::<String>()
        .split('_')
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join("_")
}

pub fn build_analysis_prompt(run: &RunContext) -> anyhow::Result<String> {
    let template = include_str!("analysis_prompt.hbs");
    let handlebars = Handlebars::new();
    handlebars
        .render_template(
            template,
            &json!({
                "analysis_id": run.analysis_id,
                "run_id": run.run_id,
                "user_prompt": run.user_prompt,
                "agent_id": run.agent_id,
            }),
        )
        .map_err(Into::into)
}

pub fn build_portfolio_analysis_prompt(
    run: &RunContext,
    portfolio: &PortfolioDetail,
) -> anyhow::Result<String> {
    let template = include_str!("portfolio_analysis_prompt.hbs");
    let handlebars = Handlebars::new();

    let total_value: Option<f64> = portfolio
        .holdings
        .iter()
        .try_fold(0.0_f64, |acc, h| h.market_value.map(|v| acc + v));
    let total_value_label = total_value.map_or_else(|| "unknown".to_string(), format_money);

    let holdings: Vec<Value> = portfolio
        .holdings
        .iter()
        .map(|h| {
            let price = match (h.market_value, h.quantity) {
                (Some(mv), q) if q.abs() > f64::EPSILON => Some(mv / q),
                _ => None,
            };
            json!({
                "entity_id": portfolio_holding_entity_id(&h.symbol, h.market.as_deref()),
                "symbol": h.symbol,
                "market": h.market.clone().unwrap_or_default(),
                "name": h.name.clone().unwrap_or_default(),
                "quantity": format_number(h.quantity),
                "price": price.map_or_else(|| "—".to_string(), format_money),
                "market_value": h.market_value.map_or_else(|| "—".to_string(), format_money),
                "weight_pct": h
                    .allocation_pct
                    .map_or_else(|| "—".to_string(), |p| format!("{:.2}", p * 100.0)),
            })
        })
        .collect();

    let as_of = portfolio
        .import_batches
        .first()
        .map_or_else(|| "unknown".to_string(), |batch| batch.imported_at.clone());

    handlebars
        .render_template(
            template,
            &json!({
                "analysis_id": run.analysis_id,
                "run_id": run.run_id,
                "user_prompt": run.user_prompt,
                "agent_id": run.agent_id,
                "portfolio": {
                    "name": portfolio.portfolio.name,
                    "base_currency": portfolio.portfolio.base_currency,
                },
                "snapshot": {
                    "as_of": as_of,
                    "total_value": total_value_label,
                    "count": portfolio.holdings.len(),
                },
                "holdings": holdings,
            }),
        )
        .map_err(Into::into)
}

pub fn build_prompt_for(
    analysis: &Analysis,
    run: &RunContext,
    db: &Database,
) -> anyhow::Result<String> {
    if analysis.intent == AnalysisIntent::Portfolio
        && let Some(portfolio_id) = analysis.portfolio_id.as_deref()
        && let Some(detail) = db.get_portfolio_detail(portfolio_id)?
    {
        return build_portfolio_analysis_prompt(run, &detail);
    }
    build_analysis_prompt(run)
}

fn format_number(value: f64) -> String {
    if value.fract().abs() < 1e-9 {
        format!("{value:.0}")
    } else {
        format!("{value:.4}")
    }
}

fn format_money(value: f64) -> String {
    if value.abs() >= 1000.0 {
        format!("{value:.0}")
    } else {
        format!("{value:.2}")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::{AnalysisStatus, MetricSnapshot, PortfolioCsvImportInput};
    use std::path::PathBuf;

    fn fixture_run() -> RunContext {
        RunContext {
            analysis_id: "a".into(),
            run_id: "run-1".into(),
            agent_id: "fake".into(),
            user_prompt: "Review portfolio".into(),
            created_at: chrono::Utc::now().to_rfc3339(),
            enabled_sources: Vec::new(),
            is_explanation_pass: false,
        }
    }

    fn fixture_report() -> AnalysisReport {
        let now = chrono::Utc::now().to_rfc3339();
        AnalysisReport {
            analysis: Analysis {
                id: "a".into(),
                title: "Bank review".into(),
                user_prompt: "Review bank valuation".into(),
                intent: AnalysisIntent::SingleEquity,
                status: AnalysisStatus::Running,
                active_run_id: Some("run-1".into()),
                portfolio_id: None,
                created_at: now.clone(),
                updated_at: now.clone(),
            },
            runs: Vec::new(),
            research_plan: None,
            entities: Vec::new(),
            sources: Vec::new(),
            metrics: vec![MetricSnapshot {
                id: "m-1".into(),
                run_id: "run-1".into(),
                entity_id: None,
                metric: "P/E ratio".into(),
                numeric_value: 12.4,
                unit: Some("x".into()),
                period: None,
                as_of: "2026-04-01".into(),
                source_id: "s-1".into(),
                prior_value: None,
                change_pct: None,
            }],
            artifacts: Vec::new(),
            blocks: vec![crate::domain::AnalysisBlock {
                id: "b-1".into(),
                run_id: "run-1".into(),
                kind: crate::domain::BlockKind::Financials,
                title: "Financials".into(),
                body: "CASA ratio and NIM are central to this bank's deposit economics.".into(),
                evidence_ids: Vec::new(),
                confidence: 0.8,
                importance: crate::domain::Importance::High,
                display_order: 1,
                created_at: now,
            }],
            final_stance: None,
            projections: Vec::new(),
            counter_theses: Vec::new(),
            uncertainty_entries: Vec::new(),
            methodology_note: None,
            decision_criterion_answers: Vec::new(),
            explanations: Vec::new(),
            holding_reviews: Vec::new(),
            allocation_reviews: Vec::new(),
            portfolio_risks: Vec::new(),
            rebalancing_suggestions: Vec::new(),
            portfolio_scenario_analyses: Vec::new(),
            portfolio_expected_return_models: Vec::new(),
        }
    }

    #[test]
    fn explanation_targets_include_metrics_and_detected_terms() {
        let targets = explanation_targets_from_report(&fixture_report());
        let keys = targets
            .iter()
            .map(|target| (target.target_type.as_str(), target.target_key.as_str()))
            .collect::<Vec<_>>();

        assert!(keys.contains(&("metric", "p_e_ratio")));
        assert!(keys.contains(&("term", "casa")));
        assert!(keys.contains(&("term", "nim")));
    }

    #[test]
    fn dispatcher_picks_portfolio_template_for_portfolio_intent() {
        let db = Database::open_at(PathBuf::from(":memory:")).unwrap();
        let import_result = db
            .import_portfolio_csv(&PortfolioCsvImportInput {
                portfolio_id: None,
                portfolio_name: Some("Core".into()),
                account_id: None,
                account_name: None,
                institution: None,
                account_type: None,
                base_currency: "USD".into(),
                source_name: "snapshot".into(),
                import_kind: crate::domain::PortfolioImportKind::Positions,
                rows: Vec::new(),
            })
            .unwrap();
        let portfolio_id = import_result.portfolio_id.clone();

        let now = chrono::Utc::now().to_rfc3339();
        let portfolio_analysis = Analysis {
            id: "a-p".into(),
            title: "Portfolio review — Core".into(),
            user_prompt: "Review".into(),
            intent: AnalysisIntent::Portfolio,
            status: AnalysisStatus::Running,
            active_run_id: None,
            portfolio_id: Some(portfolio_id),
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        let generic_analysis = Analysis {
            id: "a-g".into(),
            title: "Analyze AAPL".into(),
            user_prompt: "Analyze AAPL".into(),
            intent: AnalysisIntent::SingleEquity,
            status: AnalysisStatus::Running,
            active_run_id: None,
            portfolio_id: None,
            created_at: now.clone(),
            updated_at: now,
        };

        let run = fixture_run();
        let portfolio_prompt = build_prompt_for(&portfolio_analysis, &run, &db).unwrap();
        assert!(portfolio_prompt.contains("<portfolio>"));
        assert!(portfolio_prompt.contains("submit_holding_review"));

        let generic_prompt = build_prompt_for(&generic_analysis, &run, &db).unwrap();
        assert!(!generic_prompt.contains("<portfolio>"));
        assert!(generic_prompt.contains("submit_research_plan"));
    }
}
