// ─────────────────────────────────────────────────────────────
//  Edit everything here — the whole site renders from PROFILE.
// ─────────────────────────────────────────────────────────────
const PROFILE = {
  name: "Karan Katore",
  handle: "karankatore",
  initials: "KK",
  location: "Mumbai, India",
  timezone: "Asia/Kolkata", // IANA zone, shown in the status bar
  email: "karankatore01@gmail.com",
  resume: "", // drop resume.pdf into this folder and set "resume.pdf" to enable resume links
  status: "AI Engineer @ NymbleUp",

  roles: ["AI Engineer", "Computer Vision Engineer", "Generative AI & RAG", "Deep Learning Engineer"],
  tagline:
    "AI Engineer at NymbleUp building production computer vision and LLM systems — from raw data and training to real-time inference.",

  // Big scrolling band under the hero
  marquee: ["Computer Vision", "Generative AI", "RAG Systems", "Deep Learning", "Real-time Video Analytics", "LLMs"],

  stats: [
    { value: "1+", label: "years in AI / ML" },
    { value: "4", label: "AI projects shipped" },
    { value: "8.68", label: "B.Tech CGPA" },
  ],

  links: {
    github: "https://github.com/karankatore01",
    linkedin: "https://linkedin.com/in/karan-katore-3a3280243",
  },

  about: {
    paragraphs: [
      "I'm an AI engineer who builds systems that leave the notebook — computer vision pipelines that run on real cameras, and LLM applications that answer from real documents.",
      "At NymbleUp in Mumbai I work on production AI across computer vision, deep learning and large language models: training detection and classification models, turning live video into analytics, and optimizing models to run fast on limited hardware.",
      "I studied Computer Science at Sandip University (B.Tech, 8.68 CGPA) after a diploma in Computer Engineering. I like problems where the data is messy and the result has to work in the real world.",
    ],
    config: {
      role: "AI Engineer",
      company: "NymbleUp",
      based_in: "Mumbai, India",
      focus: ["computer vision", "generative AI", "RAG", "video analytics"],
      daily_stack: ["Python", "PyTorch", "OpenCV", "LangChain", "FastAPI"],
      education: "B.Tech CSE · 8.68 CGPA",
      coffee_dependency: true,
    },
  },

  // Skill categories → colors used across the site
  categories: {
    lang: { label: "languages", color: "#ff7a90" },
    ml: { label: "ml / dl", color: "#3ef0a8" },
    cv: { label: "vision", color: "#5ab4ff" },
    llm: { label: "llm / genai", color: "#b18cff" },
    mlops: { label: "deploy / data", color: "#ffb86b" },
  },

  skills: [
    ["Python", "lang"], ["C++", "lang"], ["C", "lang"], ["SQL", "lang"], ["HTML/CSS", "lang"],
    ["PyTorch", "ml"], ["TensorFlow", "ml"], ["Keras", "ml"], ["scikit-learn", "ml"], ["XGBoost", "ml"], ["Pandas", "ml"], ["NumPy", "ml"],
    ["OpenCV", "cv"], ["Object Detection", "cv"], ["Classification", "cv"], ["Video Analytics", "cv"], ["VGG-16", "cv"],
    ["LangChain", "llm"], ["RAG", "llm"], ["FAISS", "llm"], ["Hugging Face", "llm"], ["Transformers", "llm"], ["OpenAI API", "llm"],
    ["FastAPI", "mlops"], ["Flask", "mlops"], ["AWS Lambda", "mlops"], ["PostgreSQL", "mlops"], ["Git", "mlops"], ["Power BI", "mlops"],
  ],

  // Projects render as "model cards". cat must be a key in categories.
  projects: [
    {
      id: "model_01",
      title: "Retail Video Analytics",
      cat: "cv",
      desc: "Production computer vision at NymbleUp: detecting and tracking people across multi-camera store CCTV, telling staff apart from customers, and turning live feeds into store analytics — optimized to run on edge GPUs.",
      pipeline: ["CCTV feeds", "detection", "tracking", "staff / customer", "analytics"],
      metrics: [["input", "live CCTV"], ["target", "edge GPU"], ["output", "KPIs"]],
      tags: ["PyTorch", "OpenCV", "Python"],
    },
    {
      id: "model_02",
      title: "RAG-Based AI Chatbot",
      cat: "llm",
      desc: "Chatbot that retrieves from a document store before answering, for more grounded, context-aware responses. Served with Flask on AWS Lambda for scalable real-time replies.",
      pipeline: ["documents", "chunk + embed", "FAISS", "LangChain", "LLM"],
      metrics: [["relevance", "+30%"], ["retrieval", "FAISS"], ["deploy", "Lambda"]],
      tags: ["LangChain", "FAISS", "Flask", "AWS"],
      github: "https://github.com/karankatore01/Rag-Based-ChatBot",
    },
    {
      id: "model_03",
      title: "Deceptive Feedback Detection",
      cat: "ml",
      desc: "Classifier that flags deceptive reviews and feedback on online platforms, trained on 50,000+ samples, with a live Flask + JavaScript dashboard for monitoring and reporting.",
      pipeline: ["feedback", "NLP features", "SVM / RF", "dashboard"],
      metrics: [["samples", "50k+"], ["accuracy", "+25%"], ["models", "SVM · RF"]],
      tags: ["scikit-learn", "Flask", "JavaScript"],
      github: "https://github.com/karankatore01/Detecting_deceptive_feedback_using-_AI",
    },
    {
      id: "model_04",
      title: "Age & Gender Detection",
      cat: "cv",
      desc: "Web app that predicts age and gender from a photo using a VGG-16 deep learning model, deployed for real-time classification on cloud infrastructure.",
      pipeline: ["image", "preprocess", "VGG-16", "Flask app"],
      metrics: [["gender acc", "90%"], ["age acc", "85%"], ["backbone", "VGG-16"]],
      tags: ["TensorFlow", "Keras", "Flask"],
      github: "https://github.com/karankatore01/Age-and-Gender-detection",
    },
  ],

  // Newest first. loss = just for the chart, lower = later in career.
  experience: [
    {
      epoch: 4,
      date: "Jul 2026 — present",
      title: "AI Engineer",
      org: "NymbleUp",
      points: [
        "Building production-ready AI systems across computer vision, machine learning, deep learning and LLMs.",
        "Developing and optimizing models for real-time video analytics from live store cameras.",
        "Owning the pipeline end-to-end: data and annotation, training, evaluation and deployment on edge GPUs.",
      ],
      loss: 0.1,
    },
    {
      epoch: 3,
      date: "Feb 2026 — Jun 2026",
      title: "AI Engineer Intern",
      org: "NymbleUp",
      points: [
        "Developed and trained computer vision models for object detection, image classification and real-time video analytics using Python and deep learning frameworks.",
      ],
      loss: 0.24,
    },
    {
      epoch: 2,
      date: "Feb 2025 — Jan 2026",
      title: "Data Science Intern",
      org: "Sitecanyon",
      points: [
        "Remote internship applying Python and machine learning to real data science problems.",
        "Data cleaning, feature engineering, model building and evaluation end-to-end.",
      ],
      loss: 0.5,
    },
    {
      epoch: 1,
      date: "2019 — 2025",
      title: "B.Tech, Computer Science & Engineering",
      org: "Sandip University",
      points: [
        "B.Tech CSE, Sandip University (Dec 2022 – Jul 2025) — CGPA 8.68 / 10.",
        "Diploma in Computer Engineering, Guru Gobind Singh Polytechnic (2019 – 2022) — 82.57%.",
      ],
      loss: 0.93,
    },
  ],
};
