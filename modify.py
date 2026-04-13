import re
import sys

with open("client/src/pages/projects/CreateProjectPage.jsx", "r", encoding="utf-8") as f:
    text = f.read()

start_marker = "  return ("
end_marker = "    </DashboardLayout>\n  );\n}"

start_index = text.find(start_marker)
end_index = text.rfind(end_marker)

if start_index == -1 or end_index == -1:
    print("Cannot find boundaries!", start_index, end_index)
    sys.exit(1)

new_jsx = """  return (
    <DashboardLayout>
      <div className="flex overflow-hidden h-[calc(100vh-theme(spacing.16))] -m-8 bg-background">
        
        {/* Column 1: Left Sidebar (Proposal Navigation) */}
        <aside className="w-64 flex-none border-r bg-muted/20 flex flex-col z-10 shadow-sm relative">
          <div className="p-5 border-b bg-card">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Proposals</h2>
            <p className="text-xs text-muted-foreground mt-1">Min 3, Max 10.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {titleProposals.map((proposal, index) => {
              const isActive = expandedProposalIndex === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setExpandedProposalIndex(index)}
                  className={`group relative w-full flex items-center p-3 rounded-lg border transition-all text-left text-sm ${
                    isActive 
                      ? "bg-primary text-primary-foreground border-primary shadow-md" 
                      : "bg-card hover:bg-accent/50 text-foreground"
                  }`}
                >
                  <span className={`flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold mr-3 ${isActive ? "bg-primary-foreground text-primary" : "bg-muted text-muted-foreground"}`}>
                    {index + 1}
                  </span>
                  <span className="font-medium truncate flex-1">
                    {proposal.title ? proposal.title : `Tap to write title...`}
                  </span>
                  {titleProposals.length > 3 && (
                    <X
                      className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 bg-background/20 rounded-full hover:bg-background/40"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTitleProposal(index);
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="p-4 border-t bg-muted/10">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold bg-background group"
              onClick={() => {
                addTitleProposal();
                setExpandedProposalIndex(titleProposals.length);
              }}
              disabled={titleProposals.length >= 10}
            >
              <Plus className="mr-2 h-4 w-4 group-hover:text-primary" />
              Add More Title Proposal
            </Button>
          </div>
        </aside>

        {/* Column 2: Main Editor */}
        <main className="flex-1 flex flex-col relative bg-background">
          {/* Global Header inside Main Panel */}
          <header className="flex-none border-b bg-card/80 backdrop-blur px-8 py-5 flex items-center justify-between sticky top-0 z-20">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Create Capstone Project</h1>
              <p className="text-muted-foreground text-sm mt-1">Automatically using academic year and section.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 px-3 py-1">
                🟡 Draft (Auto-saves)
              </Badge>
              {hasFinalizedTeam === false && !isTeamLoading && (
                <Badge variant="destructive" className="px-3 py-1">Needs Team Finalization</Badge>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto w-full pb-32 scrollbar-thin">
            <div className="p-8 max-w-4xl mx-auto">
              <form id="project-form" onSubmit={handleSubmit} className="space-y-12">
                
                {/* Global Errors */}
                {createProject.error && (
                   <Alert variant="destructive">
                     <AlertTriangle className="h-5 w-5" />
                     <AlertDescription className="ml-2">
                       {createProject.error?.response?.data?.error?.message ||
                         createProject.error?.message ||
                         "Failed to create project"}
                     </AlertDescription>
                   </Alert>
                )}

                {/* Section A: Basic Information */}
                <section className="space-y-6 animate-in slide-in-from-bottom-2">
                  <div className="border-b border-border/50 pb-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-muted-foreground">A.</span>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Basic Information</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">The core identity of Proposal {expandedProposalIndex + 1}.</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card p-6 rounded-xl border shadow-sm">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="active-title" className="text-sm font-semibold">Proposal Title *</Label>
                      <Input
                        id="active-title"
                        className="h-12 text-lg"
                        placeholder="Enter a descriptive, clear title..."
                        value={titleProposals[expandedProposalIndex]?.title || ""}
                        onChange={(e) => handleTitleProposalChange(expandedProposalIndex, "title", e.target.value)}
                        required={expandedProposalIndex < 3}
                        minLength={10}
                        maxLength={300}
                      />
                    </div>
                    
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label htmlFor="active-capstoneType" className="text-sm font-semibold">Capstone Type *</Label>
                      <TagInput
                        id="active-capstoneType"
                        placeholder="Type to add capstone category (e.g. Web App, AI)"
                        value={titleProposals[expandedProposalIndex]?.capstoneType || []}
                        onChange={(newTags) => handleTitleProposalChange(expandedProposalIndex, "capstoneType", newTags)}
                        suggestions={CAPSTONE_TYPE_SUGGESTIONS}
                        maxTags={5}
                      />
                    </div>
                  </div>
                </section>

                {/* Section B: The Pitch */}
                <section className="space-y-6">
                  <div className="border-b border-border/50 pb-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-muted-foreground">B.</span>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">The Pitch</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Source material for your generated Pitch Deck.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
                    {PROPOSAL_PITCH_DECK_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-2 group">
                        <Label htmlFor={`active-${field.key}`} className="text-sm font-semibold flex justify-between">
                          <span>{field.label} {expandedProposalIndex < 3 && <span className="text-destructive">*</span>}</span>
                        </Label>
                        <Textarea
                          id={`active-${field.key}`}
                          placeholder={field.placeholder}
                          value={titleProposals[expandedProposalIndex]?.pitchDeck?.[field.key] || ""}
                          onChange={(e) => handlePitchDeckFieldChange(expandedProposalIndex, field.key, e.target.value)}
                          required={expandedProposalIndex < 3}
                          minLength={20}
                          maxLength={1000}
                          rows={3}
                          className="resize-y transition-all focus:h-32"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section C: Academic Details */}
                <section className="space-y-6">
                  <div className="border-b border-border/50 pb-3 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-muted-foreground">C.</span>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Academic Details</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">Global classifications that apply to your team`s research scope.</p>
                    </div>
                  </div>
                  
                  <div className="space-y-8 bg-card p-6 rounded-xl border shadow-sm">
                    <div className="space-y-2">
                      <div className="flex justify-between items-end">
                        <Label htmlFor="abstract" className="text-sm font-semibold">Abstract</Label>
                        <span className={`text-xs font-mono font-medium ${form.abstract.length >= 480 ? "text-destructive animate-pulse" : "text-muted-foreground"}`}>
                          {form.abstract.length}/500 chars
                        </span>
                      </div>
                      <Textarea
                        id="abstract"
                        name="abstract"
                        placeholder="Brief description of your overall project goals (optional)"
                        value={form.abstract}
                        onChange={(e) => setForm(prev => ({ ...prev, abstract: e.target.value }))}
                        maxLength={500}
                        rows={5}
                        className="bg-muted/30"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <Label htmlFor="keywords" className="text-sm font-semibold">Keywords</Label>
                          <span className="text-xs text-muted-foreground">{keywordList.length}/10</span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            id="keywords"
                            placeholder="Type & press enter..."
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={handleKeywordKeyDown}
                            className="bg-muted/30"
                          />
                          <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
                        </div>
                        {keywordList.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border rounded-lg min-h-12 items-center">
                            {keywordList.map((kw) => (
                              <span key={kw} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary border border-primary/20">
                                {kw}
                                <button type="button" onClick={() => removeKeyword(kw)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-semibold">SDG Tags * (Select 1-5 tags)</Label>
                        <div className="flex gap-2">
                          <select
                            value=""
                            onChange={(e) => addProposalSdgTag(expandedProposalIndex, e.target.value)}
                            className="h-10 flex-1 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Choose an SDG tag focused goal...</option>
                            {SDG_TAG_SUGGESTIONS.map((tag) => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                          </select>
                        </div>
                        {titleProposals[expandedProposalIndex]?.sdgTags?.length > 0 && (
                          <div className="flex flex-wrap gap-2 p-3 bg-muted/20 border rounded-lg min-h-12 items-center">
                            {titleProposals[expandedProposalIndex].sdgTags.map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-3 py-1 text-xs font-medium border border-emerald-200">
                                {tag}
                                <button type="button" onClick={() => removeProposalSdgTag(expandedProposalIndex, tag)} className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </form>
            </div>
          </div>

          {/* Sticky Footer Toolbar */}
          <div className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 px-6 py-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-20">
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <Button 
                type="button" 
                variant="outline" 
                size="lg"
                className="font-medium"
                onClick={() => handleSaveProposalDraft(expandedProposalIndex)}
              >
                <Save className="mr-2 h-4 w-4 text-muted-foreground" /> Save Draft 
                <span className="ml-2 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">Auto</span>
              </Button>
              
              <div className="flex items-center gap-3">
                <Button 
                  type="button" 
                  variant="secondary"
                  size="lg"
                  className="font-medium hidden sm:flex"
                  onClick={() => generateDeck(expandedProposalIndex, titleProposals[expandedProposalIndex])}
                  disabled={generatingProposalIndex === expandedProposalIndex}
                >
                  {generatingProposalIndex === expandedProposalIndex ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Compiling PDF...</>
                  ) : "Generate Presentation Deck PDF"}
                </Button>
                
                <Button 
                  type="submit" 
                  form="project-form"
                  size="lg"
                  className="font-bold relative overflow-hidden group"
                  disabled={createProject.isPending || needsTeamFinalization}
                >
                  {createProject.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />}
                  <span className="relative">Submit All {titleProposals.length} Proposals</span>
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* Column 3: Right Panel (Analysis & Similarity Checker) */}
        <aside className="w-80 flex-none border-l bg-slate-50/40 flex flex-col z-10 relative">
          <div className="p-5 border-b bg-card">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Search className="h-4 w-4" /> Similarity Report
            </h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Cross-checking University Archives and Internet Sources for Proposal {expandedProposalIndex + 1}.
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
            
            {/* 1. Large Scan Action Button inside Panel */}
            <Button 
              type="button" 
              onClick={() => scanSimilarity(expandedProposalIndex, titleProposals[expandedProposalIndex])}
              disabled={isScanningSimilarityIndex === expandedProposalIndex}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-sm transition-all hover:shadow"
            >
              {isScanningSimilarityIndex === expandedProposalIndex ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Content...</>
              ) : "Scan Complete Pitch Now"}
            </Button>

            {/* 2. Detailed Breakdown Results */}
            {proposalSimilarityResults[expandedProposalIndex] && proposalSimilarityResults[expandedProposalIndex].length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200/50">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  <h3 className="font-bold text-red-900 text-sm tracking-tight">Critical Overlap Detected</h3>
                </div>
                
                <div className="space-y-4 pt-1 text-sm">
                  {proposalSimilarityResults[expandedProposalIndex].map((match, i) => (
                    <div key={match._id || i} className="bg-white rounded-lg p-3 border border-red-100 shadow-sm relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                      
                      <div className="pl-2">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-500">Document #{i + 1}</span>
                          <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                            {Math.round(match.score * 100)}% Match
                          </span>
                        </div>
                        
                        <div className="font-medium text-slate-900 leading-snug mb-2">
                          "{match.title}"
                        </div>
                        
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                          <span className="font-semibold text-slate-700">{match.status || "Archived Research"}</span> 
                          {match.academicYear && ` • Year: ${match.academicYear}`}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="mt-4 p-3 bg-red-100/50 rounded-lg border border-red-200">
                    <h4 className="text-xs font-bold text-red-800 mb-1 uppercase tracking-wider">Recommendation</h4>
                    <p className="text-xs text-red-700 leading-relaxed">
                       Your proposal overlaps heavily with an existing project. Consider emphasizing your `<span className="font-semibold">Unique Contribution</span>` in the pitch deck to differentiate it.
                    </p>
                  </div>
                </div>
              </div>
            ) : proposalSimilarityResults[expandedProposalIndex] ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-200/50">
                  <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                  <h3 className="font-bold text-emerald-900 text-sm tracking-tight">Originality Verified (Safe)</h3>
                </div>
                <p className="text-sm text-emerald-800 leading-relaxed pt-1">
                  The manual scan found no heavily matching documents in the university archives. Your problem statement and solution appear distinct.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
                <Search className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No Assessment Yet</p>
                <p className="text-xs text-slate-500 mt-2">Run the scan button above to cross-reference the full pitch deck context.</p>
              </div>
            )}
            
            {/* 3. Title Fast Checker */}
            <div className="pt-6 border-t border-slate-200/60">
              <h3 className="text-xs font-bold text-slate-700 mb-4 tracking-tight flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div> Title Match Scanner (Live)
              </h3>
              
              <div className="bg-white rounded-xl border p-4 shadow-sm">
                {titleProposals[expandedProposalIndex]?.title ? (
                  <TitleSimilarityChecker
                    title={titleProposals[expandedProposalIndex].title}
                    keywords={keywordList}
                    debounceMs={500}
                  />
                ) : (
                  <div className="text-sm text-center py-6 text-slate-400 italic">Type a title in the Main Editor to see instant string matches...</div>
                )}
              </div>
            </div>

          </div>
        </aside>
        
      </div>
    </DashboardLayout>
  );
}"""

with open("client/src/pages/projects/CreateProjectPage.jsx", "w", encoding="utf-8") as f:
    f.write(text[:start_index] + new_jsx + "\n")
    print("SUCCESS")

