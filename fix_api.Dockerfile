FROM cmsv2-plagiarism_api:latest
ENTRYPOINT []
CMD ["uvicorn", "plagiarism_engine.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
