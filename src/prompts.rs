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

    // Metric targets from snapshot data
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

    // Term targets from prose blocks
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

    // Artifact targets from structured artifacts
    for artifact in &report.artifacts {
        // KPI grid and ratio snapshot row labels (metric names)
        for (idx, row) in artifact.rows.iter().enumerate() {
            if let Some(metric_name) = row.get("metric").and_then(|v| v.as_str()) {
                let target_key = format!("artifact:{}:row_{}", artifact.id, idx);
                let display_name = metric_name.replace('_', " ");
                if seen.insert(("artifact".to_string(), target_key.clone())) {
                    let value = row
                        .get("value")
                        .or_else(|| row.get("numeric_value"))
                        .and_then(serde_json::Value::as_f64);
                    let unit = row.get("unit").and_then(|v| v.as_str()).map(String::from);
                    targets.push(ExplanationTarget {
                        target_type: "artifact".to_string(),
                        target_key,
                        display_name: display_name.clone(),
                        metric_name: display_name,
                        value,
                        unit,
                        as_of: None,
                    });
                }
            }
            // Factor list factor names
            if let Some(factor_name) = row.get("factor").and_then(|v| v.as_str()) {
                let target_key = format!("artifact:{}:factor_{}", artifact.id, idx);
                let display_name = factor_name.replace('_', " ");
                if seen.insert(("artifact".to_string(), target_key.clone())) {
                    targets.push(ExplanationTarget {
                        target_type: "artifact".to_string(),
                        target_key,
                        display_name: display_name.clone(),
                        metric_name: display_name,
                        value: None,
                        unit: None,
                        as_of: None,
                    });
                }
            }
        }

        // Column headers from artifacts
        for (idx, column) in artifact.columns.iter().enumerate() {
            let target_key = format!("artifact:{}:col_{}", artifact.id, idx);
            if seen.insert(("artifact".to_string(), target_key.clone())) {
                targets.push(ExplanationTarget {
                    target_type: "artifact".to_string(),
                    target_key,
                    display_name: column.label.clone(),
                    metric_name: column.label.clone(),
                    value: None,
                    unit: column.unit.clone(),
                    as_of: None,
                });
            }
        }
    }

    // Projection targets
    for projection in &report.projections {
        // Projected metric name
        let metric_key = format!("projection:{}:metric", projection.id);
        if seen.insert(("projection".to_string(), metric_key.clone())) {
            targets.push(ExplanationTarget {
                target_type: "projection".to_string(),
                target_key: metric_key,
                display_name: projection.metric.replace('_', " "),
                metric_name: projection.metric.clone(),
                value: Some(projection.current_value),
                unit: Some(projection.unit.clone()),
                as_of: None,
            });
        }
    }

    // Portfolio holding review targets
    for review in &report.holding_reviews {
        // Stance labels
        let stance_key = format!("portfolio:{}:stance", review.id);
        if seen.insert(("portfolio".to_string(), stance_key.clone())) {
            targets.push(ExplanationTarget {
                target_type: "portfolio".to_string(),
                target_key: stance_key,
                display_name: format!("{} stance", review.stance),
                metric_name: review.stance.to_string(),
                value: Some(review.confidence),
                unit: Some("confidence".to_string()),
                as_of: None,
            });
        }
    }

    // Portfolio allocation targets — scoped by review.id so multiple reviews
    // sharing the same dimension each get their own explanation.
    for review in &report.allocation_reviews {
        for dimension in &review.dimensions {
            let dim_key = format!("portfolio:allocation:{}:{}", review.id, dimension.dimension);
            if seen.insert(("portfolio".to_string(), dim_key.clone())) {
                targets.push(ExplanationTarget {
                    target_type: "portfolio".to_string(),
                    target_key: dim_key,
                    display_name: format!("{} allocation", dimension.dimension).replace('_', " "),
                    metric_name: dimension.dimension.to_string(),
                    value: None,
                    unit: None,
                    as_of: None,
                });
            }
        }
    }

    // Portfolio risk targets
    for risk in &report.portfolio_risks {
        for (idx, exposure) in risk.factor_exposures.iter().enumerate() {
            let factor_key = format!("portfolio:risk:{}:factor_{}", risk.id, idx);
            if seen.insert(("portfolio".to_string(), factor_key.clone())) {
                targets.push(ExplanationTarget {
                    target_type: "portfolio".to_string(),
                    target_key: factor_key,
                    display_name: exposure.factor.clone(),
                    metric_name: exposure.factor.clone(),
                    value: None,
                    unit: Some(exposure.level.to_string()),
                    as_of: None,
                });
            }
        }
    }

    // Rebalancing suggestion targets
    for suggestion in &report.rebalancing_suggestions {
        for (idx, row) in suggestion.rows.iter().enumerate() {
            let row_key = format!("portfolio:rebalancing:{}:row_{}", suggestion.id, idx);
            if seen.insert(("portfolio".to_string(), row_key.clone())) {
                targets.push(ExplanationTarget {
                    target_type: "portfolio".to_string(),
                    target_key: row_key,
                    display_name: row.label.clone(),
                    metric_name: row.label.clone(),
                    value: Some(row.delta),
                    unit: Some("delta".to_string()),
                    as_of: None,
                });
            }
        }
    }

    targets
}

#[must_use]
pub fn normalize_explanation_key(value: &str) -> String {
    // Aligned with the TypeScript version in
    // frontend/src/features/report-viewer/explanation-utils.ts.
    // Both: trim → lowercase → replace non-alphanumeric runs with "_" → strip leading/trailing "_".
    // `to_ascii_lowercase` + `is_ascii_alphanumeric` behave identically to
    // JS `toLowerCase()` + `/[^a-z0-9]/` for all Unicode inputs:
    // non-ASCII characters (é, ñ, etc.) are neither ASCII alphanumeric nor in [a-z0-9],
    // so both implementations strip them to "_".
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

    #[test]
    fn normalize_explanation_key_basic_cases() {
        assert_eq!(normalize_explanation_key("P/E ratio"), "p_e_ratio");
        assert_eq!(normalize_explanation_key("  spaces  "), "spaces");
        assert_eq!(normalize_explanation_key("___leading"), "leading");
        assert_eq!(normalize_explanation_key("trailing___"), "trailing");
        assert_eq!(normalize_explanation_key("a__b__c"), "a_b_c");
        assert_eq!(normalize_explanation_key("EBIT DA"), "ebit_da");
        assert_eq!(normalize_explanation_key("net-profit"), "net_profit");
        assert_eq!(normalize_explanation_key("a.b/c"), "a_b_c");
        assert_eq!(normalize_explanation_key("_"), "");
        assert_eq!(normalize_explanation_key("___"), "");
        assert_eq!(normalize_explanation_key("revenue"), "revenue");
    }

    #[test]
    fn normalize_explanation_key_non_ascii_stripped() {
        // Non-ASCII alphanumeric chars are stripped by both Rust and TS implementations.
        assert_eq!(normalize_explanation_key("ÉPS"), "ps");
        assert_eq!(normalize_explanation_key("café"), "caf");
    }

    #[test]
    fn explanation_targets_include_artifact_rows_and_columns() {
        use crate::domain::{ArtifactColumn, ArtifactKind, StructuredArtifact};

        let mut report = fixture_report();
        report.artifacts = vec![StructuredArtifact {
            id: "art-1".into(),
            run_id: "run-1".into(),
            kind: ArtifactKind::KpiGrid,
            title: "Key Metrics".into(),
            summary: String::new(),
            columns: vec![
                ArtifactColumn {
                    key: "metric".into(),
                    label: "Metric".into(),
                    unit: None,
                    description: None,
                },
                ArtifactColumn {
                    key: "value".into(),
                    label: "Value".into(),
                    unit: Some("USD".into()),
                    description: None,
                },
            ],
            rows: vec![
                serde_json::json!({
                    "metric": "Net Interest Margin",
                    "value": 3.2,
                    "unit": "%"
                }),
                serde_json::json!({
                    "metric": "Cost to Income",
                    "value": 42.1,
                    "unit": "%"
                }),
                serde_json::json!({
                    "factor": "Credit Quality",
                    "value": "Strong"
                }),
            ],
            series: Vec::new(),
            evidence_ids: Vec::new(),
            display_order: 1,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let keys: Vec<(&str, &str)> = targets
            .iter()
            .map(|t| (t.target_type.as_str(), t.target_key.as_str()))
            .collect();

        // Row targets for "metric" rows
        assert!(keys.contains(&("artifact", "artifact:art-1:row_0")));
        assert!(keys.contains(&("artifact", "artifact:art-1:row_1")));
        // Factor target for "factor" row
        assert!(keys.contains(&("artifact", "artifact:art-1:factor_2")));
        // Column targets
        assert!(keys.contains(&("artifact", "artifact:art-1:col_0")));
        assert!(keys.contains(&("artifact", "artifact:art-1:col_1")));

        // Verify display names
        let row0 = targets
            .iter()
            .find(|t| t.target_key == "artifact:art-1:row_0")
            .unwrap();
        assert_eq!(row0.display_name, "Net Interest Margin");
        assert_eq!(row0.value, Some(3.2));
        assert_eq!(row0.unit.as_deref(), Some("%"));

        let col1 = targets
            .iter()
            .find(|t| t.target_key == "artifact:art-1:col_1")
            .unwrap();
        assert_eq!(col1.display_name, "Value");
        assert_eq!(col1.unit.as_deref(), Some("USD"));
    }

    #[test]
    fn explanation_targets_include_projection_metric() {
        use crate::domain::{Projection, ProjectionScenario, ScenarioLabel};

        let mut report = fixture_report();
        report.projections = vec![Projection {
            id: "proj-1".into(),
            run_id: "run-1".into(),
            entity_id: "AAPL".into(),
            horizon: "12M".into(),
            metric: "EPS".into(),
            current_value: 6.42,
            current_value_label: "$6.42".into(),
            unit: "USD".into(),
            scenarios: vec![ProjectionScenario {
                label: ScenarioLabel::Bull,
                target_value: 8.50,
                target_label: "$8.50".into(),
                probability: 0.3,
                rationale: "Strong upgrade cycle".into(),
                catalysts: Vec::new(),
                risks: Vec::new(),
            }],
            methodology: "DCF".into(),
            key_assumptions: Vec::new(),
            evidence_ids: Vec::new(),
            confidence: 0.7,
            disclaimer: String::new(),
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let keys: Vec<(&str, &str)> = targets
            .iter()
            .map(|t| (t.target_type.as_str(), t.target_key.as_str()))
            .collect();

        assert!(keys.contains(&("projection", "projection:proj-1:metric")));
        // Scenarios are NOT targets (frontend doesn't render scenario explanations)
        assert!(!keys.contains(&("projection", "projection:proj-1:scenario:bull")));

        let metric_target = targets
            .iter()
            .find(|t| t.target_key == "projection:proj-1:metric")
            .unwrap();
        assert_eq!(metric_target.display_name, "EPS");
        assert_eq!(metric_target.value, Some(6.42));
        assert_eq!(metric_target.unit.as_deref(), Some("USD"));
    }

    #[test]
    fn explanation_targets_include_portfolio_stance() {
        use crate::domain::{HoldingReview, HoldingStance, Importance};

        let mut report = fixture_report();
        report.holding_reviews = vec![HoldingReview {
            id: "hr-1".into(),
            run_id: "run-1".into(),
            entity_id: "AAPL".into(),
            stance: HoldingStance::Add,
            rationale: "Strong fundamentals".into(),
            key_reasons: Vec::new(),
            key_risks: Vec::new(),
            confidence: 0.8,
            importance: Importance::High,
            evidence_ids: Vec::new(),
            display_order: 1,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let stance = targets
            .iter()
            .find(|t| t.target_key == "portfolio:hr-1:stance")
            .unwrap();
        assert_eq!(stance.target_type, "portfolio");
        assert_eq!(stance.display_name, "add stance");
        assert_eq!(stance.value, Some(0.8));
    }

    #[test]
    fn explanation_targets_include_portfolio_allocation() {
        use crate::domain::{
            AllocationAxis, AllocationBucket, AllocationDimension, AllocationReview,
        };

        let mut report = fixture_report();
        report.allocation_reviews = vec![AllocationReview {
            id: "ar-1".into(),
            run_id: "run-1".into(),
            summary: String::new(),
            dimensions: vec![AllocationDimension {
                dimension: AllocationAxis::Sector,
                breakdown: vec![
                    AllocationBucket {
                        label: "Technology".into(),
                        weight: 0.45,
                        commentary: None,
                    },
                    AllocationBucket {
                        label: "Financials".into(),
                        weight: 0.30,
                        commentary: None,
                    },
                ],
                concentration_flags: Vec::new(),
                overlap_notes: None,
            }],
            evidence_ids: Vec::new(),
            confidence: 0.7,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let keys: Vec<(&str, &str)> = targets
            .iter()
            .filter(|t| t.target_type == "portfolio")
            .map(|t| (t.target_type.as_str(), t.target_key.as_str()))
            .collect();

        assert!(keys.contains(&("portfolio", "portfolio:allocation:ar-1:sector")));
        // Buckets are NOT targets (frontend doesn't render bucket explanations)
        assert!(keys.iter().all(|(_, k)| !k.contains("bucket")));
    }

    #[test]
    fn explanation_targets_include_portfolio_risk_factors() {
        use crate::domain::{FactorExposure, PortfolioRisk, RiskLevel};

        let mut report = fixture_report();
        report.portfolio_risks = vec![PortfolioRisk {
            id: "pr-1".into(),
            run_id: "run-1".into(),
            summary: String::new(),
            factor_exposures: vec![
                FactorExposure {
                    factor: "Interest Rate".into(),
                    level: RiskLevel::High,
                    commentary: None,
                },
                FactorExposure {
                    factor: "Currency".into(),
                    level: RiskLevel::Medium,
                    commentary: None,
                },
            ],
            correlation_notes: None,
            macro_sensitivities: Vec::new(),
            single_name_risks: Vec::new(),
            tail_risks: Vec::new(),
            evidence_ids: Vec::new(),
            confidence: 0.6,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let keys: Vec<(&str, &str)> = targets
            .iter()
            .filter(|t| t.target_type == "portfolio")
            .map(|t| (t.target_type.as_str(), t.target_key.as_str()))
            .collect();

        assert!(keys.contains(&("portfolio", "portfolio:risk:pr-1:factor_0")));
        assert!(keys.contains(&("portfolio", "portfolio:risk:pr-1:factor_1")));
    }

    #[test]
    fn explanation_targets_include_rebalancing_rows() {
        use crate::domain::{RebalancingRow, RebalancingSuggestion};

        let mut report = fixture_report();
        report.rebalancing_suggestions = vec![RebalancingSuggestion {
            id: "rs-1".into(),
            run_id: "run-1".into(),
            rationale: "Reduce concentration".into(),
            rows: vec![
                RebalancingRow {
                    label: "Trim AAPL".into(),
                    current_weight: 0.25,
                    suggested_weight: 0.15,
                    delta: -0.10,
                    commentary: None,
                },
                RebalancingRow {
                    label: "Add MSFT".into(),
                    current_weight: 0.10,
                    suggested_weight: 0.15,
                    delta: 0.05,
                    commentary: None,
                },
            ],
            scenarios: Vec::new(),
            caveats: Vec::new(),
            evidence_ids: Vec::new(),
            confidence: 0.7,
            created_at: chrono::Utc::now().to_rfc3339(),
        }];

        let targets = explanation_targets_from_report(&report);
        let keys: Vec<(&str, &str)> = targets
            .iter()
            .filter(|t| t.target_type == "portfolio")
            .map(|t| (t.target_type.as_str(), t.target_key.as_str()))
            .collect();

        assert!(keys.contains(&("portfolio", "portfolio:rebalancing:rs-1:row_0")));
        assert!(keys.contains(&("portfolio", "portfolio:rebalancing:rs-1:row_1")));

        let row0 = targets
            .iter()
            .find(|t| t.target_key == "portfolio:rebalancing:rs-1:row_0")
            .unwrap();
        assert_eq!(row0.display_name, "Trim AAPL");
        assert_eq!(row0.value, Some(-0.10));
    }

    #[test]
    fn explanation_targets_dedup_by_type_and_key() {
        use crate::domain::{ArtifactColumn, ArtifactKind, StructuredArtifact};

        let mut report = fixture_report();
        // Two artifacts with same row structure — their keys include artifact id,
        // so they should NOT be deduped against each other.
        let make_artifact = |id: &str| StructuredArtifact {
            id: id.into(),
            run_id: "run-1".into(),
            kind: ArtifactKind::KpiGrid,
            title: "Grid".into(),
            summary: String::new(),
            columns: vec![ArtifactColumn {
                key: "metric".into(),
                label: "Metric".into(),
                unit: None,
                description: None,
            }],
            rows: vec![serde_json::json!({"metric": "Revenue"})],
            series: Vec::new(),
            evidence_ids: Vec::new(),
            display_order: 1,
            created_at: chrono::Utc::now().to_rfc3339(),
        };
        report.artifacts = vec![make_artifact("a-1"), make_artifact("a-2")];

        let targets = explanation_targets_from_report(&report);
        let art_targets: Vec<&str> = targets
            .iter()
            .filter(|t| t.target_type == "artifact")
            .map(|t| t.target_key.as_str())
            .collect();

        // Both artifacts generate separate row targets
        assert!(art_targets.contains(&"artifact:a-1:row_0"));
        assert!(art_targets.contains(&"artifact:a-2:row_0"));

        // But duplicate metrics from report.metrics and artifacts don't collide
        // because they have different target_types or different keys.
        let metric_count = targets.iter().filter(|t| t.target_key == "revenue").count();
        // "revenue" won't be generated because fixture_report has no metric named "revenue"
        // but the artifact row key "artifact:a-1:row_0" is distinct from any bare metric key.
        assert_eq!(metric_count, 0);
    }
}
