export type PortfolioProject = {
  slug: string;
  number: string;
  title: string;
  category: string;
  period: string;
  role: string;
  sourceUrl?: string;
  summary: string;
  question: string;
  storyArc?: [string, string, string, string];
  evidence: string[];
  tools: string[];
  process: Array<{ title: string; description: string }>;
  insights: string[];
  decisionValue: string;
  limitations: string[];
  notClaimed?: string[];
  suggestedVisuals: string[];
  caution?: string;
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "arctic-route",
    number: "01",
    title: "Arctic Route Accessibility Analysis",
    category: "Climate Data · Logistics Strategy",
    period: "July 2026",
    role: "Individual project · polar big-data analysis",
    sourceUrl: "https://github.com/aquariusmin/arctic-route-accessibility-analysis",
    summary:
      "Measured how many months a year Arctic shipping routes are actually open, using observed NSIDC sea-ice concentration grids from 1979 to 2025, and translated the result into distance saved on the Busan–Rotterdam leg.",
    question:
      "How much has sea-ice loss changed the operational window of Arctic routes, and what choice does that leave a Korean shipper?",
    evidence: [
      "NSIDC Sea Ice Index v4 monthly sea-ice concentration grids at 25 km, 1979–2025",
      "SHA-256 checksum data manifest with idempotent ingestion scripts",
      "Gridded-versus-official extent cross-check and 50 km buffer sensitivity analysis",
      "CSV outputs recording OLS and Theil-Sen trends side by side, with roughly 30 tests",
    ],
    tools: ["Python", "pandas", "NumPy", "rasterio", "GeoPandas", "SciPy", "statsmodels", "pytest"],
    process: [
      {
        title: "Pin down provenance",
        description:
          "Ingested NSIDC gridded GeoTIFFs, fixed provenance with a SHA-256 checksum manifest, and cross-checked gridded extent against the official NSIDC series.",
      },
      {
        title: "Build route corridors",
        description:
          "Buffered the great-circle tracks of the Northern Sea Route, Northwest Passage, and Transpolar route by 50 km, rasterised them onto the ice grid, and split them into segments for bottleneck detection.",
      },
      {
        title: "Compute feasibility",
        description:
          "Applied per-vessel-class concentration thresholds to decide navigability by year and month, identified the limiting bottleneck segment, and aggregated navigable months per year.",
      },
      {
        title: "Validate trends and read scenarios",
        description:
          "Ran OLS alongside robust Theil-Sen and reported a trend only when both agreed, then framed the distance saving against Suez as logistics and cruise scenarios.",
      },
    ],
    insights: [
      "For ice-1A/PC7 vessels the NSR navigable season grew from about 0 months a year in the 1980s to about 3.4 months a year since 2015, a robust +0.9 months per decade where OLS and Theil-Sen agree.",
      "September corridor sea-ice concentration fell about 3.2% per decade.",
      "The NSR is 3,151 nautical miles, about 29.8%, shorter than the Suez routing for Busan–Rotterdam.",
      "The Transpolar route is the shortest on paper but recorded zero navigable months across the entire record for non-icebreaking vessels.",
    ],
    decisionValue:
      "Reduced the finding to two decision-grade numbers, navigable months per year and nautical miles saved, so routes can be compared on when and for how long they are usable.",
    limitations: [
      "This is an observation-based analysis, not a climate model that forecasts future ice.",
      "Navigability is judged on sea-ice concentration thresholds and excludes insurance, port, icebreaker-escort, and regulatory constraints.",
      "Some risk and cost layers in the extended Phase E analysis use synthetic stand-ins where real data was unavailable; these are labelled explicitly in the code.",
    ],
    notClaimed: [
      "Does not forecast future sea ice. Only past trends from observed grids.",
      "Does not claim commercial navigability. Insurance, ports, icebreaker support, and regulation are excluded.",
      "Does not claim domain expertise. GIS and climate data were explored with AI assistance.",
    ],
    suggestedVisuals: [
      "Navigable months per year",
      "September corridor concentration trend with OLS and Theil-Sen",
      "NSR bottleneck comparison",
      "Distance saving versus Suez",
    ],
    caution:
      "Navigable months describe physical accessibility under concentration thresholds; they do not mean commercial transit is operationally viable.",
  },
  {
    slug: "busan-station-dwell",
    number: "02",
    title: "Busan Station Dwell Conversion Analysis",
    category: "Public Data · Urban Policy",
    period: "August 2026 (in progress)",
    role: "Individual project · entry in preparation for the 2026 Big Data competition",
    sourceUrl: "https://github.com/aquariusmin/busan-station-dwell",
    summary:
      "Estimated dwell, a variable absent from the source data, using only Busan metro tap-in and tap-out records, and identified stations where arrivals are high but people do not stay.",
    question:
      "What does a ridership-based policy target list miss? Are alighting and dwelling the same thing?",
    evidence: [
      "40,544 rows of hourly boarding and alighting counts across 112 stations, January–June 2026",
      "System-wide daily boarding-alighting gap of at most 0.748%, confirming the data is gate-based",
      "Station-level KPI table joined with station coordinates and building attributes",
      "Weekday and weekend hourly boarding profiles used to test the lodging hypothesis",
    ],
    tools: ["Python", "pandas", "NumPy", "Korea Public Data Portal", "Little's Law"],
    process: [
      {
        title: "Test the premise first",
        description:
          "Compared system-wide boardings and alightings to confirm the data records gate crossings, so inter-line transfers never appear as a boarding or alighting.",
      },
      {
        title: "Design the dwell metric",
        description:
          "Built net rail-attributable dwelling population as cumulative alightings minus cumulative boardings, then divided the curve area by daily alightings to derive mean dwell time.",
      },
      {
        title: "Find and fix the defect",
        description:
          "Found the raw metric collapsing to negative values at residential stations and applied a per-day min-shift so only the rail-attributable increment remained.",
      },
      {
        title: "Test the competing explanation",
        description:
          "Checked whether hotel density explains Haeundae's low dwell using a checkout index, and recorded the conclusion that it does not.",
      },
    ],
    insights: [
      "After the min-shift correction, mean dwell time at non-transfer stations moved from an impossible −1.23 hours to 2.78 hours.",
      "The order of the daily trough and peak alone separated 49 inflow-type stations from 63 residential-type stations.",
      "Haeundae station averages 0.96 hours of dwell, the lowest of the 49 inflow-type stations against a median of 2.09, and shows the widest gap between alighting rank and dwell rank.",
      "The lodging explanation was detectable but insufficient: the Sunday checkout index reached 2.72, yet the signal accounts for only 5.8% of inflow and cannot explain the low conversion rate.",
    ],
    decisionValue:
      "Ranking stations by failed dwell conversion instead of raw ridership produces a different target list for commercial-district renewal budgets, and producing that list is the point of the analysis.",
    limitations: [
      "The project is in progress ahead of a September 2026 submission, and current figures are first-round validation results.",
      "Commercial-establishment data and regression residual diagnostics are still outstanding, so stations undersupplied relative to dwell are not yet identified.",
      "The dwell measure is a proxy for rail-attributable presence and excludes arrivals by bus or car.",
      "Only 112 of 114 stations appear in the ridership data, so two stations are missing from the analysis.",
    ],
    notClaimed: [
      "Does not claim dwell time was measured. It is a proxy estimated from gate records.",
      "Does not claim a verified link to commercial revenue. Merging retail data is still outstanding.",
      "Does not claim final results. This is first-pass validation ahead of a September 2026 submission.",
    ],
    suggestedVisuals: [
      "Hourly dwell curve before and after the min-shift correction",
      "Alighting rank versus dwell rank scatter",
      "Inflow-type and residential-type station map",
      "Haeundae hourly boarding profile by day of week",
    ],
    caution:
      "Dwelling population and dwell time are estimated from gate records; they are not measured mobility data from telecom or card sources.",
  },
  {
    slug: "telecom-churn",
    number: "03",
    title: "Telecom Customer Churn Analysis",
    category: "Customer Analytics · Strategy",
    period: "Summer 2025",
    role: "Individual project · KW-Corporation university virtual-company program",
    sourceUrl: "https://github.com/aquariusmin/kw-corp-churn-strategy-analysis",
    summary:
      "Analyzed 7,043 telecom customer records and used explainable classification models to identify churn-risk segments and propose targeted retention actions.",
    question:
      "Which customers are most likely to leave, why are they at risk, and which retention response fits each segment?",
    evidence: [
      "7,043 customer records across profile, contract, tenure, billing, payment, service, and churn fields",
      "70/30 train-test split and seven classification models",
      "Model evaluation using ROC-AUC, precision, recall, and F1-score",
    ],
    tools: ["Python", "pandas", "scikit-learn", "Gradient Boosting", "XGBoost", "SHAP"],
    process: [
      {
        title: "Prepare the evidence",
        description:
          "Converted blank TotalCharges entries, encoded categorical variables, and created analysis-ready training and test sets.",
      },
      {
        title: "Find meaningful segments",
        description:
          "Examined churn patterns across contract type, tenure, monthly charges, payment method, and service adoption.",
      },
      {
        title: "Compare and interpret models",
        description:
          "Compared seven classifiers, selected Gradient Boosting on the strongest ROC-AUC, and used SHAP and dependence analysis to explain key drivers.",
      },
      {
        title: "Translate analysis into action",
        description:
          "Connected risk drivers to proposed contract, onboarding, and service-support interventions.",
      },
    ],
    insights: [
      "Month-to-month contracts were the clearest churn-risk signal.",
      "Shorter tenure and higher monthly charges were associated with greater risk.",
      "Non-use of selected security and technical-support services provided additional risk signals.",
      "Gradient Boosting reaches a test-set ROC-AUC of 0.841, and reproduce.py in the repository regenerates the same metrics table.",
    ],
    decisionValue:
      "The analysis turns a binary prediction task into a prioritization framework and proposes retention strategies targeting a 5.0 percentage-point reduction in churn; the target has not been achieved or validated.",
    limitations: [
      "The dataset is public and does not include campaign exposure, complaint history, intervention cost, or observed retention outcomes.",
      "The final model pipeline, hyperparameters, random seed, and metrics table should be reproduced before treating the exact score as verified.",
      "Proposed interventions require experimental validation and explicit retention KPIs.",
    ],
    notClaimed: [
      "Does not claim churn fell by 5.0 percentage points. It is a pre-execution target still to be tested.",
      "Does not read SHAP as causal. It explains how the model decided, nothing more.",
      "Does not claim a real retention outcome. The public dataset carries no intervention results.",
    ],
    suggestedVisuals: [
      "Contract-type churn-rate chart",
      "Seven-model comparison table",
      "SHAP driver summary",
      "Proposed segment-to-action matrix",
    ],
    caution:
      "The 5.0 percentage-point churn reduction is a proposed planning target, not an achieved business result.",
  },
  {
    slug: "satellite-gdp",
    number: "04",
    title: "Satellite Night-Light GDP Analysis",
    category: "Economics · Alternative Data",
    period: "Spring 2025",
    role: "Individual project",
    sourceUrl: "https://github.com/aquariusmin/Satellite-GDP-Insight",
    summary:
      "Combined VIIRS night-light and World Bank indicators to examine whether satellite-observed brightness can complement conventional measures of national economic activity.",
    question:
      "Can night-light intensity help explain GDP where official statistics are limited, and do urban population and electricity access change that relationship?",
    evidence: [
      "VIIRS night-light data and World Bank GDP, population, urban-population, and electricity-access indicators",
      "Primary study period: 2019-2023",
      "Distinct data stages: 973 raw rows, 820 merged observations, and 791 usable GDP observations",
    ],
    tools: ["Python", "SPSS", "Excel", "Regression", "Interaction effects"],
    process: [
      {
        title: "Integrate country-year data",
        description:
          "Merged satellite brightness and economic indicators at the country-year level.",
      },
      {
        title: "Prepare the variables",
        description:
          "Applied log transformations to skewed variables and centered moderator variables.",
      },
      {
        title: "Test the relationship",
        description:
          "Estimated the baseline regression and added urban-population and electricity-access interaction terms.",
      },
      {
        title: "Define responsible use",
        description:
          "Interpreted model fit alongside infrastructure effects, missing data, and non-economic sources of light.",
      },
    ],
    insights: [
      "Night-light intensity explains 81.9% of GDP variation in the simple model (R-squared = 0.819, N = 791), reproducible via reproduce.py in the repository.",
      "Urban population and electricity access produced statistically significant interaction effects in the report.",
      "The result is explanatory and should not be described as prediction accuracy or causal proof.",
    ],
    decisionValue:
      "Night-light data can provide a complementary signal for early market screening, country-risk research, and economic monitoring where conventional reporting is limited.",
    limitations: [
      "The final country count and the 973/820/791 dataset stages require a reproducible data dictionary.",
      "An earlier-year Albania record and the final brightness definition require reconciliation.",
      "Fixed-effects and out-of-sample analysis are needed before making predictive claims.",
    ],
    notClaimed: [
      "Does not claim predictive accuracy. R-squared is in-sample explanatory power.",
      "Does not claim causation. Brightness does not create GDP.",
      "Does not propose a new method. It checks how far a known relationship holds.",
    ],
    suggestedVisuals: [
      "VIIRS and World Bank data-flow diagram",
      "Log brightness versus log GDP scatterplot",
      "Moderation-effect diagram",
      "What the result supports / does not support panel",
    ],
    caution:
      "R-squared = 0.819 describes explanatory fit in the simple model; it is not 81.9% prediction accuracy.",
  },
  {
    slug: "korean-air",
    number: "05",
    title: "Korean Air Financial Analysis",
    category: "Financial Research · Strategy",
    period: "Spring 2025",
    role: "Individual project",
    sourceUrl: "https://github.com/aquariusmin/koreanair_equity_research",
    summary:
      "Evaluated Korean Air through macroeconomic, industry, financial-ratio, and multiple valuation frameworks, focusing on model conflict under uncertain FCF assumptions.",
    question:
      "How should Korean Air be evaluated when post-pandemic recovery, large investment needs, leverage, and uncertain cash-flow assumptions cause valuation methods to diverge?",
    evidence: [
      "2020-2024 profitability, efficiency, liquidity, leverage, and interest-coverage analysis",
      "Macroeconomic and airline-industry research",
      "DCF, APV, comparable-company multiples, sensitivity analysis, and reverse engineering",
    ],
    tools: ["Financial statements", "DCF", "APV", "Multiples", "WACC", "Excel"],
    process: [
      {
        title: "Establish the context",
        description:
          "Reviewed post-pandemic economic conditions, airline recovery, fuel, FX, demand, and integration risks.",
      },
      {
        title: "Assess operating and financial trends",
        description:
          "Analyzed profitability, efficiency, liquidity, leverage, and interest coverage across 2020-2024.",
      },
      {
        title: "Compare valuation methods",
        description:
          "Applied DCF, APV, and peer multiples using an estimated WACC of approximately 2.8%.",
      },
      {
        title: "Diagnose divergence",
        description:
          "Used sensitivity analysis and reverse engineering to identify why absolute and relative values conflicted.",
      },
    ],
    insights: [
      "Selected CAPEX and working-capital assumptions produced negative FCF, making DCF and APV negative or unstable.",
      "Relative valuation produced a more positive interpretation.",
      "The central lesson was the sensitivity and conflict across methods—not a headline target price.",
    ],
    decisionValue:
      "When valuation methods diverge, decision-makers need an assumption audit rather than a mechanical average or an attractive headline number.",
    limitations: [
      "The unavailable valuation workbook should be recreated and audited.",
      "Formulas, peers, units, dates, estimates, and target-price arithmetic require verification before public use.",
      "Exact financial and market source dates should be documented.",
    ],
    notClaimed: [
      "Does not issue a target price. The figures are not usable for an investment decision.",
      "Is not investment advice. It is a conditional analysis built on coursework.",
      "Does not claim every assumption was audited. Workbook formulas and peer selection still need review.",
    ],
    suggestedVisuals: [
      "2020-2024 ratio trends",
      "Absolute versus relative valuation divergence",
      "FCF assumption bridge",
      "Valuation audit checklist",
    ],
    caution:
      "This is conditional classroom analysis, not investment advice or a verified public target price.",
  },
  {
    slug: "quant-trading-fleet",
    number: "06",
    title: "Quant Trading Automation",
    category: "Fintech · Strategy Validation and Operations",
    period: "2025–present",
    role: "Individual project · tqt (Toss Open API) · Quant Trading Fleet",
    sourceUrl: "https://github.com/aquariusmin/toss-api-quant-trading",
    summary:
      "Spent less time inventing strategies than on checking whether a strategy has an edge and on being able to start, stop, and record it safely. tqt handles validation and execution; Fleet is the operating dashboard.",
    question:
      "What does running trading rules as a service require beyond strategy code, and how do you confirm the rules actually have an edge?",
    evidence: [
      "Daily-bar backtest over eight domestically listed global ETFs and two government-bond ETFs, 2011–2026",
      "Cost assumptions using the account's real commission rate read from the API, 10 bp slippage, and next-open fills",
      "Walk-forward out-of-sample results (five-year train, two-year test) plus parameter sensitivity sweeps",
      "KIS and Binance/CCXT broker interfaces with bot state, strategy settings, order history, and logs",
    ],
    tools: ["Python", "pandas", "FastAPI", "React", "TypeScript", "SQLite", "SQLAlchemy", "Docker", "Toss Open API"],
    process: [
      {
        title: "Separate strategy from broker logic",
        description:
          "Designed a broker abstraction layer to isolate per-exchange differences in market data and order handling.",
      },
      {
        title: "Make state and history visible",
        description:
          "Persisted bot state, settings, execution history, and operating logs, controlled through a FastAPI service and a React dashboard.",
      },
      {
        title: "Backtest on measured costs",
        description:
          "Replaced assumed fees with the account's actual rates from the API and applied slippage and next-open fills so cost assumptions match reality.",
      },
      {
        title: "Validate out-of-sample, then on paper",
        description:
          "Reported performance only from a five-year train, two-year test walk-forward, then validated operations with paper trading that fills against the live order book.",
      },
    ],
    insights: [
      "Out-of-sample, the Faber moving-average sleeve returned 7.36% CAGR with a 1.01 Sharpe, a −14.1% maximum drawdown, and decay of ×1.28, so there is no sign of overfitting.",
      "Buy-and-hold still wins on CAGR at 8.94%. What tactical allocation buys is not return but drawdown, cutting the maximum from −20.1% to −14.5%.",
      "The Toss Open API serves only about four days of one-minute bars, which makes intraday backtesting impossible. Choosing low-frequency daily strategies was a constraint, not a preference.",
      "Automated trading is an operations problem as much as a modelling one: state checks, logs, parameter management, a kill switch, and recovery procedures are what make it safe to leave running.",
    ],
    decisionValue:
      "Instead of claiming returns, set out in numbers and operating controls the conditions under which a strategy may run and the signals that should switch it off.",
    limitations: [
      "Both projects are at paper-trading validation with no real-money operating history.",
      "The backtest universe consists of currently listed instruments, so some survivorship bias remains.",
      "Most validated strategies lost money in 2022; this design does not defend a period where equities and long bonds fall together.",
      "Long-running uptime, order-failure handling, and restart scenarios remain separate operating concerns.",
    ],
    notClaimed: [
      "Does not claim returns or win rate. There is no real-money track record.",
      "Does not claim the strategy has an edge. The best variant still trailed buy-and-hold on CAGR.",
      "Does not claim production operation. It remains at paper trading.",
    ],
    suggestedVisuals: [
      "In-sample versus out-of-sample walk-forward comparison",
      "CAGR and maximum drawdown trade-off by strategy",
      "System architecture from strategy to dashboard",
      "Anonymised dashboard shown in paper-trading mode",
    ],
    caution:
      "Paper-trading validation only. Backtest figures are simulations on historical data and claim no real-money operation, return, win rate, or capital growth.",
  },
  {
    slug: "financial-ai-model-study",
    number: "07",
    title: "Financial AI Model Study",
    category: "Applied Analytics · Model Selection",
    period: "Fall 2024",
    role: "Individual project series",
    sourceUrl: "https://github.com/aquariusmin/financial-ai-model-study",
    summary:
      "Compared regression, dimensionality-reduction, tree, support-vector, and neural-network approaches to understand when model complexity improves generalization.",
    question:
      "How do preprocessing, regularization, model complexity, and hyperparameters affect validation and test performance?",
    evidence: [
      "Four applied assignments using financial and public datasets",
      "Training, validation, and test comparisons",
      "RMSE, MSE, ROC-AUC, scree plots, tuning surfaces, and loss curves",
    ],
    tools: ["Python", "scikit-learn", "TensorFlow/Keras", "PCA", "SVM/SVR", "ANN/DNN"],
    process: [
      {
        title: "Test model complexity",
        description:
          "Compared polynomial degrees and decision-tree settings using held-out performance.",
      },
      {
        title: "Examine representation and regularization",
        description:
          "Applied PCA, standardization, Ridge, and Lasso to understand structure and overfitting.",
      },
      {
        title: "Tune support-vector models",
        description:
          "Evaluated Linear SVR parameter combinations on Iowa housing data.",
      },
      {
        title: "Compare neural-network depth",
        description:
          "Compared linear regression, a one-hidden-layer ANN, and a three-hidden-layer DNN.",
      },
    ],
    insights: [
      "The first two reported PCA components explained approximately 88.4% of variance in the national-risk example.",
      "Linear SVR with C=1 and epsilon=50 was strongest among the tested combinations.",
      "Additional DNN depth produced little improvement over the smaller ANN.",
    ],
    decisionValue:
      "Use additional complexity only when validation evidence justifies it; a more advanced method is not automatically the stronger business choice.",
    limitations: [
      "Original datasets and data dictionaries should be recovered.",
      "The four assignments should be consolidated into reproducible notebooks.",
      "Classroom metrics should not be presented as production performance.",
    ],
    notClaimed: [
      "Does not claim applied business impact. These are assignment-level comparisons.",
      "Does not claim one model is always better. It depends on the data and the goal.",
    ],
    suggestedVisuals: [
      "PCA scree plot",
      "Linear SVR tuning surface",
      "Decision-tree train/test comparison",
      "ANN versus DNN validation loss",
    ],
  },
  {
    slug: "phorage",
    number: "08",
    title: "Phorage Brand and Commerce MVP",
    category: "Service Planning · MVP",
    period: "2025-Present",
    role: "Individual project",
    sourceUrl: "https://github.com/aquariusmin/abovemin",
    summary:
      "Developed a pre-launch photography-goods MVP covering brand concept, physical product production, customer journey, commerce workflows, and administration.",
    question:
      "How can a personal photography concept be translated into a testable product and service experience before public launch?",
    evidence: [
      "Physical photography goods produced",
      "Product discovery, cart, order, and administration workflows",
      "Limited acquaintance-based product sharing or sales",
    ],
    tools: ["Service planning", "Next.js", "React", "TypeScript", "Supabase", "Zustand"],
    process: [
      {
        title: "Define the concept",
        description:
          "Developed the brand story and intended customer experience around photography goods.",
      },
      {
        title: "Produce a tangible offer",
        description:
          "Created physical products rather than limiting validation to interface mockups.",
      },
      {
        title: "Build the service flow",
        description:
          "Implemented storefront, filtering, product detail, cart, order, and administration workflows.",
      },
      {
        title: "Run a limited early test",
        description:
          "Shared or sold a limited number of goods to acquaintances before public launch.",
      },
    ],
    insights: [
      "A creative product needs both a coherent customer-facing story and workable back-office operations.",
      "The MVP made customer and operator workflows visible before public launch.",
      "Early acquaintance-based activity is useful for learning but is not public traction.",
    ],
    decisionValue:
      "The project demonstrates service planning, MVP prioritization, physical-digital integration, and the definition of launch hypotheses and metrics.",
    limitations: [
      "The number and type of goods produced should be documented.",
      "Gifts, product tests, and paid acquaintance sales should be separated.",
      "Target customer, qualitative feedback, and launch metrics still require definition.",
    ],
    notClaimed: [
      "Does not claim a public launch. It is a pre-release MVP.",
      "Does not claim traffic, order, or revenue figures. Only small-scale checks with acquaintances.",
    ],
    suggestedVisuals: [
      "Physical product photography",
      "Customer-journey map",
      "Storefront and administration screens",
      "Pre-launch hypothesis and metrics table",
    ],
    caution:
      "Pre-launch MVP only. No public launch, public traction, large-scale orders, or verified sales metrics are claimed.",
  },
  {
    slug: "blood-type-survey",
    number: "09",
    title: "Blood Type and Personality Survey Study",
    category: "Research Design · Statistics",
    period: "Fall 2023",
    role: "Team project · survey design, cleaning, analysis, and visualization",
    summary:
      "Helped design and analyze a 101-response survey testing whether blood type was statistically associated with four MBTI dimensions.",
    question:
      "Does a familiar social belief about blood type and personality remain supported when translated into hypotheses and tested with survey data?",
    evidence: [
      "28-question Google Forms survey",
      "101 responses",
      "Observed and expected frequencies across four MBTI dimensions",
    ],
    tools: ["Survey design", "Excel", "Cross-tabulation", "Chi-square tests", "Visualization"],
    process: [
      {
        title: "Design the research",
        description:
          "Helped create demographic, blood-type, MBTI-related, and attention-check questions.",
      },
      {
        title: "Prepare the responses",
        description:
          "Cleaned and organized 101 responses for cross-tabulation.",
      },
      {
        title: "Test independence",
        description:
          "Calculated observed and expected frequencies and applied chi-square independence tests.",
      },
      {
        title: "Limit the conclusion",
        description:
          "Interpreted results against the sample's age concentration, acquaintance recruitment, and measurement constraints.",
      },
    ],
    insights: [
      "Three MBTI dimensions did not show a statistically significant association with blood type.",
      "One isolated result exceeded the reported threshold.",
      "The isolated result does not establish a broad scientific relationship.",
    ],
    decisionValue:
      "The study demonstrates how to turn a popular claim into testable hypotheses and restrict the conclusion to what the evidence supports.",
    limitations: [
      "The sample was concentrated among respondents in their twenties and recruited through team acquaintances.",
      "Team size and task division still require confirmation.",
      "Exact p-values and expected-frequency assumptions should be checked and reported.",
    ],
    notClaimed: [
      "Does not claim blood type relates to personality. Three of four dimensions showed no significant association.",
      "Does not claim a generalizable conclusion. The sample skews toward people in their twenties.",
    ],
    suggestedVisuals: [
      "Survey and hypothesis flow",
      "Sample-demographic summary",
      "Observed-versus-expected table",
      "Limitations panel",
    ],
    caution:
      "One isolated significant result does not prove a broad relationship between blood type and personality.",
  },
];

export function getPortfolioProject(slug: string) {
  return portfolioProjects.find((project) => project.slug === slug);
}
