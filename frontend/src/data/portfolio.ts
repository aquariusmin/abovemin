export type PortfolioProject = {
  slug: string;
  number: string;
  title: string;
  category: string;
  period: string;
  role: string;
  summary: string;
  question: string;
  evidence: string[];
  tools: string[];
  process: Array<{ title: string; description: string }>;
  insights: string[];
  decisionValue: string;
  limitations: string[];
  suggestedVisuals: string[];
  caution?: string;
};

export const portfolioProjects: PortfolioProject[] = [
  {
    slug: "telecom-churn",
    number: "01",
    title: "Telecom Customer Churn Analysis",
    category: "Customer Analytics · Strategy",
    period: "Summer 2025",
    role: "Individual project · KW-Corporation university virtual-company program",
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
          "Compared seven classifiers, selected Gradient Boosting based on the strongest reported ROC-AUC, and used SHAP and dependence analysis to explain key drivers.",
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
      "Gradient Boosting produced a reported ROC-AUC of approximately 0.842; a reproducible final metrics table is still needed.",
    ],
    decisionValue:
      "The analysis turns a binary prediction task into a prioritization framework and proposes retention strategies targeting a 5.0 percentage-point reduction in churn; the target has not been achieved or validated.",
    limitations: [
      "The dataset is public and does not include campaign exposure, complaint history, intervention cost, or observed retention outcomes.",
      "The final model pipeline, hyperparameters, random seed, and metrics table should be reproduced before treating the exact score as verified.",
      "Proposed interventions require experimental validation and explicit retention KPIs.",
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
    number: "02",
    title: "Satellite Night-Light GDP Analysis",
    category: "Economics · Alternative Data",
    period: "Spring 2025",
    role: "Individual project",
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
      "Night-light intensity explained 81.9% of GDP variation in the reported simple model (R-squared = 0.819).",
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
    suggestedVisuals: [
      "VIIRS and World Bank data-flow diagram",
      "Log brightness versus log GDP scatterplot",
      "Moderation-effect diagram",
      "What the result supports / does not support panel",
    ],
    caution:
      "R-squared = 0.819 describes explanatory fit in the reported simple model; it is not 81.9% prediction accuracy.",
  },
  {
    slug: "korean-air",
    number: "03",
    title: "Korean Air Financial Analysis",
    category: "Financial Research · Strategy",
    period: "Spring 2025",
    role: "Individual project",
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
    number: "04",
    title: "Quant Trading Fleet",
    category: "Fintech · Service Operations",
    period: "2025-Present",
    role: "Individual project",
    summary:
      "Built a live-server paper-trading system connecting strategy bots, broker abstractions, persistent execution data, controls, logging, and a monitoring dashboard.",
    question:
      "What operating infrastructure is required to move trading rules from standalone scripts into a controllable and observable service?",
    evidence: [
      "KIS and Binance/CCXT broker interfaces",
      "Bot states, strategy settings, logs, and execution history",
      "Live-server paper-trading validation",
    ],
    tools: ["Python", "FastAPI", "React", "TypeScript", "SQLite", "SQLAlchemy", "Docker"],
    process: [
      {
        title: "Separate strategy and broker logic",
        description:
          "Created broker abstractions for exchange-specific data and order behavior.",
      },
      {
        title: "Make state observable",
        description:
          "Modeled bot states, settings, execution history, and operational logs in SQLite.",
      },
      {
        title: "Add operator control",
        description:
          "Implemented FastAPI services, asynchronous bot controls, and a React/TypeScript dashboard.",
      },
      {
        title: "Validate operations",
        description:
          "Containerized the service and began live-server paper-trading validation.",
      },
    ],
    insights: [
      "Automated trading is also an operations-design problem.",
      "A usable service needs state visibility, logging, parameter governance, test modes, recovery behavior, and human supervision.",
      "The project demonstrates how financial-service data is generated, stored, monitored, and governed.",
    ],
    decisionValue:
      "The system makes strategy operations inspectable and supports structured validation before any consideration of real-money use.",
    limitations: [
      "A formal paper-trading validation report is still needed.",
      "Uptime, failed-order, reconciliation, duplicate-order, restart, and logging criteria should be defined.",
      "Every strategy and broker mode requires end-to-end validation before the system is described as stable.",
    ],
    suggestedVisuals: [
      "Strategy-to-dashboard architecture",
      "Anonymized dashboard labeled Paper Trading",
      "Bot state-transition diagram",
      "Paper-trading validation scorecard",
    ],
    caution:
      "Paper-trading validation only. No real-money operation, returns, win rate, profitability, or capital-growth claim is made.",
  },
  {
    slug: "financial-ai-model-study",
    number: "05",
    title: "Financial AI Model Study",
    category: "Applied Analytics · Model Selection",
    period: "Fall 2024",
    role: "Individual project series",
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
    suggestedVisuals: [
      "PCA scree plot",
      "Linear SVR tuning surface",
      "Decision-tree train/test comparison",
      "ANN versus DNN validation loss",
    ],
  },
  {
    slug: "phorage",
    number: "06",
    title: "Phorage Brand and Commerce MVP",
    category: "Service Planning · MVP",
    period: "2025-Present",
    role: "Individual project",
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
    number: "07",
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
