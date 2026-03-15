FROM cmsv2-plagiarism_worker:latest
ENTRYPOINT []
CMD ["celery", "-A", "plagiarism_engine.tasks.celery_app", "worker", "--loglevel=info", "--pool=prefork", "--concurrency=2"]
