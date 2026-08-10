-- Seed the HR-provided canonical taxonomy. Duplicate names use the first
-- category in source order because Skill.name is globally unique.
WITH taxonomy_document AS (
  SELECT $taxonomy$
  {
    "categories": [
      {"category":"Microsoft Technologies","skills":[".NET Framework",".NET Core / .NET 8+","ASP.NET MVC","ASP.NET Core","C#","VB.NET","Blazor","WPF","WinForms","Entity Framework","LINQ","Web API","SignalR","Azure Functions","Azure App Services"]},
      {"category":"Microsoft Business Applications","skills":["Microsoft Dynamics 365 CRM","Dynamics 365 Business Central","Power BI","Power Apps","Power Automate","Microsoft Fabric","SharePoint Online","SharePoint Framework (SPFx)","Microsoft Teams Development","Microsoft Copilot Integration"]},
      {"category":"Salesforce","skills":["Salesforce CRM","Sales Cloud","Service Cloud","Experience Cloud","Marketing Cloud","Commerce Cloud","Health Cloud","Financial Services Cloud","Salesforce CPQ","Apex Development","Lightning Web Components (LWC)","Visualforce","SOQL & SOSL","Salesforce Flow","MuleSoft Integration","Salesforce API Integrations","AppExchange Development","Salesforce Administration","Salesforce Consulting","Salesforce Custom Development","Salesforce Support & Maintenance"]},
      {"category":"Artificial Intelligence & Generative AI","skills":["Generative AI Solutions","OpenAI","Azure OpenAI","Large Language Models (LLMs)","AI Agents","LangChain","LangGraph","CrewAI","AutoGen","Retrieval-Augmented Generation (RAG)","AI Chatbots","Computer Vision","OCR","Natural Language Processing (NLP)","Recommendation Systems","Prompt Engineering","AI Automation"]},
      {"category":"Data Science & Machine Learning","skills":["Machine Learning","Deep Learning","Predictive Analytics","Statistical Analysis","Data Mining","Data Modeling","Exploratory Data Analysis (EDA)","Feature Engineering","Time Series Forecasting","MLOps","TensorFlow","PyTorch","Scikit-learn","Pandas","NumPy","OpenCV","Jupyter Notebook"]},
      {"category":"Data Engineering & Analytics","skills":["Azure Data Factory","Azure Synapse Analytics","Microsoft Fabric","Databricks","Apache Spark","Snowflake","SQL Server","PostgreSQL","MySQL","MongoDB","ETL Development","Data Warehousing","Data Lakes","Business Intelligence","Power BI","Tableau"]},
      {"category":"DevOps & Cloud Engineering","skills":["Azure DevOps","GitHub Actions","GitLab CI/CD","Jenkins","Docker","Kubernetes","Helm","Terraform","Ansible","Chef","Puppet","Argo CD","CI/CD Pipeline Automation","Infrastructure as Code (IaC)","DevSecOps","Linux Administration","Windows Server Administration","Azure Monitor","AWS CloudWatch","Prometheus","Grafana","ELK Stack","Cloud Migration","Release Management","Performance Monitoring","Site Reliability Engineering (SRE)"]},
      {"category":"Frontend Technologies","skills":["Angular","React.js","Next.js","Vue.js","JavaScript","TypeScript","HTML5","CSS3","Bootstrap","Tailwind CSS"]},
      {"category":"Backend Technologies","skills":[".NET Core","Node.js","Express.js","Python","Java","PHP"]},
      {"category":"Mobile Development","skills":["Flutter","React Native","Android","iOS"]},
      {"category":"CMS & E-commerce","skills":["WordPress","Shopify"]},
      {"category":"QA & Testing","skills":["Manual Testing","Automation Testing","Selenium","Playwright","Cypress","API Testing","Performance Testing","Security Testing"]},
      {"category":"UI/UX Design","skills":["Figma","Adobe XD","Wireframing","Prototyping","Responsive UI/UX Design"]}
    ]
  }
  $taxonomy$::jsonb AS document
), categories AS (
  SELECT category_value, category_order
  FROM taxonomy_document,
    jsonb_array_elements(document->'categories')
      WITH ORDINALITY AS category_rows(category_value, category_order)
), flattened AS (
  SELECT
    category_value->>'category' AS category,
    skill,
    category_order,
    skill_order
  FROM categories,
    jsonb_array_elements_text(category_value->'skills')
      WITH ORDINALITY AS skill_rows(skill, skill_order)
), canonical AS (
  SELECT DISTINCT ON (skill) skill, category
  FROM flattened
  ORDER BY skill, category_order, skill_order
)
INSERT INTO "Skill" ("id", "name", "category", "needsReview")
SELECT 'taxonomy_' || md5(skill), skill, category, false
FROM canonical
ON CONFLICT ("name") DO UPDATE SET
  "category" = EXCLUDED."category",
  "needsReview" = false;
