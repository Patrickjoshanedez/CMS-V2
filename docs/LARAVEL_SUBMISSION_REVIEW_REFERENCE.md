# Laravel Reference - Submission Review Workspace

This reference mirrors the round-based review flow implemented in the MERN codebase.
Use this if you later migrate these APIs to Laravel.

## 1) Migrations

### create_submissions_table.php

```php
Schema::create('submissions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('project_id')->constrained()->cascadeOnDelete();
    $table->unsignedTinyInteger('chapter')->nullable();
    $table->string('type')->default('chapter');
    $table->boolean('review_closed')->default(false);
    $table->enum('status', [
        'pending',
        'pending_student_upload',
        'pending_instructor_review',
        'under_review',
        'approved',
        'accepted',
        'revisions_required',
        'rejected',
        'locked',
    ])->default('pending');
    $table->timestamps();
});
```

### create_submission_rounds_table.php

```php
Schema::create('submission_rounds', function (Blueprint $table) {
    $table->id();
    $table->foreignId('submission_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('round_number');
    $table->string('file_path')->nullable();
    $table->enum('status', [
        'pending_student_upload',
        'pending_instructor_review',
        'revision_requested',
        'approved',
    ])->default('pending_student_upload');
    $table->text('overall_feedback')->nullable();
    $table->timestamps();

    $table->unique(['submission_id', 'round_number']);
});
```

### create_annotations_table.php

```php
Schema::create('annotations', function (Blueprint $table) {
    $table->id();
    $table->foreignId('round_id')->constrained('submission_rounds')->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->json('highlight_data')->nullable();
    $table->text('comment_text');
    $table->timestamps();
});
```

### create_annotation_replies_table.php

```php
Schema::create('annotation_replies', function (Blueprint $table) {
    $table->id();
    $table->foreignId('annotation_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->text('reply_text');
    $table->timestamps();
});
```

## 2) Eloquent Models

```php
class Submission extends Model {
    protected $fillable = ['project_id', 'chapter', 'type', 'status', 'review_closed'];
    public function rounds() { return $this->hasMany(SubmissionRound::class); }
}

class SubmissionRound extends Model {
    protected $fillable = ['submission_id', 'round_number', 'file_path', 'status', 'overall_feedback'];
    public function submission() { return $this->belongsTo(Submission::class); }
    public function annotations() { return $this->hasMany(Annotation::class, 'round_id'); }
}

class Annotation extends Model {
    protected $fillable = ['round_id', 'user_id', 'highlight_data', 'comment_text'];
    protected $casts = ['highlight_data' => 'array'];
    public function round() { return $this->belongsTo(SubmissionRound::class, 'round_id'); }
    public function replies() { return $this->hasMany(AnnotationReply::class); }
}

class AnnotationReply extends Model {
    protected $fillable = ['annotation_id', 'user_id', 'reply_text'];
    public function annotation() { return $this->belongsTo(Annotation::class); }
}
```

## 3) Controller Method Signatures

```php
class SubmissionReviewController extends Controller {
    public function workspace(Submission $submission) {}
    public function requestRevisionRound(Request $request, Submission $submission) {}
    public function studentUploadRound(Request $request, SubmissionRound $round) {}
    public function markAccepted(Request $request, Submission $submission) {}
    public function addAnnotation(Request $request, SubmissionRound $round) {}
    public function addAnnotationReply(Request $request, Annotation $annotation) {}
}
```

## 4) Workflow Rules

- Request Another Revision:
  - mark current round status = revision_requested
  - create next round with status = pending_student_upload
  - notify team

- Student Resubmission:
  - upload file into active pending_student_upload round
  - set round status = pending_instructor_review

- Mark as Accepted:
  - set submission.review_closed = true
  - set submission.status = accepted
  - lock further round creation

## 5) Document Viewer Decision

- Google Docs iframe cannot be DOM-inspected for custom highlight overlays due cross-origin isolation.
- Recommended hybrid:
  - Google Docs embed for live viewing/editing
  - in-app annotation mode against extracted text or PDF text layer for custom highlight metadata
