from pathlib import Path
from setuptools import setup, find_packages

this_dir = Path(__file__).parent.resolve()
long_description = (this_dir / "logwatch_ai_README.md").read_text(encoding="utf-8")

setup(
    name="logwatch-ai",
    version="1.0.0",
    author="Mouayed Kordi",
    author_email="kordimouayed7@gmail.com",
    description="AI-powered Windows Event Log anomaly detection using Isolation Forest",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/mouayed-kordi/logwatch-ai",
    packages=find_packages(),
    package_data={
        "logwatch_ai": ["ml_artifacts/*.pkl"],
    },
    include_package_data=True,
    install_requires=[
        "scikit-learn",
        "pandas",
        "numpy",
        "joblib",
    ],
    python_requires=">=3.10",
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: Microsoft :: Windows",
        "Topic :: Security",
        "Topic :: System :: Logging",
    ],
)
