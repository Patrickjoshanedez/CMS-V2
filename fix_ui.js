const fs = require('fs');

const path = 'client/src/pages/projects/CreateProjectPage.jsx';
const text = fs.readFileSync(path, 'utf8');

const startIndex = text.indexOf('  return (');
const endIndex = text.lastIndexOf('}');

if (startIndex === -1 || endIndex === -1) {
  console.error('Cannot find boundaries', startIndex, endIndex);
  process.exit(1);
}

const newJsx = \  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-theme(spacing.16))] -m-4 sm:-m-6 lg:-m-8 overflow-hidden bg-slate-50/50">
        
        {/* Column 1: Left Sidebar (Proposal Navigation) */}
        <aside className="w-64 flex-none border-r bg-white flex flex-col z-10 shadow-[2px_0_10px_-4px_rgba(0,0,0,0.05)] relative">
          <div className="p-4 border-b bg-white">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">Proposals</h2>
            <p className="text-xs text-slate-400">Min 3, Max 10.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {titleProposals.map((proposal, index) => {
              const isActive = expandedProposalIndex === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => setExpandedProposalIndex(index)}
                  className={\group relative w-full flex flex-col items-start p-3 rounded border transition-all text-left text-sm \\}
                >
                  <div className="flex items-center w-full mb-1">
                    <span className={\lex-shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold mr-2 \\}>
                      {index + 1}
                    </span>
                    <span className={\ont-semibold truncate flex-1 \\}>
                      {proposal.title ? proposal.title : "Draft Title..."}
                    </span>
                    {titleProposals.length > 3 && (
                      <X
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTitleProposal(index);
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Mini pitch preview snippet */}
                  <span className="text-[10px] text-slate-400 line-clamp-1 pl-7 w-full">
                    {proposal.pitchDeck?.problemStatement || "No pitch written yet..."}
                  </span>
                </button>
              );
            })}
          </div>
          
          <div className="p-3 border-t bg-slate-50">
            <Button
              variant="outline"
              className="w-full text-xs font-semibold bg-white shadow-sm"
              onClick={() => {
                addTitleProposal();
                setExpandedProposalIndex(titleProposals.length);
              }}
              disabled={titleProposals.length >= 10}
            >
              <Plus className="mr-1.5 h-3 w-3" />
              Add More Proposal
            </Button>
          </div>
        </aside>

        {/* Column 2: Main Editor */}
        <main className="flex-1 flex flex-col relative bg-white">
          
          {/* Global Header inside Main Editor */}
          <header className="flex-none border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Create Capstone Project</h1>
              <p className="text-slate-500 text-[13px] mt-0.5">Automatically using academic year and section.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200/60 shadow-sm font-medium">
                🟡 Draft (Auto-saves)
              </Badge>
              {hasFinalizedTeam === false && !isTeamLoading && (
                <Badge variant="destructive" className="shadow-sm">Needs Team Finalization</Badge>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto w-full pb-36 scrollbar-thin bg-slate-50/30">
            <div className="p-6 lg:p-8 max-w-3xl mx-auto">
              <form id="project-form" onSubmit={handleSubmit} className="space-y-10">
                
                {createProject.error && (
                   <Alert variant="destructive" className="shadow-sm">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertDescription className="ml-1">
                       {createProject.error?.response?.data?.error?.message ||
                         createProject.error?.message ||
                         "Failed to create project"}
                     </AlertDescription>
                   </Alert>
                )}

                {/* Section A: Basic Information */}
                <section className="space-y-5">
                  <div className="border-b pb-2">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs">A</span> 
                      Basic Information
                    </h3>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl border shadow-sm space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="active-title" className="text-sm font-semibold text-slate-700">Proposal Title *</Label>
                      <Input
                        id="active-title"
                        className="h-10 text-base font-medium shadow-sm transition-shadow focus-visible:ring-blue-500/20"
                        placeholder="Enter a descriptive, clear title..."
                        value={titleProposals[expandedProposalIndex]?.title || ""}
                        onChange={(e) => handleTitleProposalChange(expandedProposalIndex, "title", e.target.value)}
                        required={expandedProposalIndex < 3}
                        minLength={10}
                        maxLength={300}
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="active-capstoneType" className="text-sm font-semibold text-slate-700">Capstone Type *</Label>
                      <div className="shadow-sm rounded-md">
                        <TagInput
                          id="active-capstoneType"
                          placeholder="Type & select capstone type..."
                          value={titleProposals[expandedProposalIndex]?.capstoneType || []}
                          onChange={(newTags) => handleTitleProposalChange(expandedProposalIndex, "capstoneType", newTags)}
                          suggestions={CAPSTONE_TYPE_SUGGESTIONS}
                          maxTags={5}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section B: The Pitch */}
                <section className="space-y-5">
                  <div className="border-b pb-2 flex justify-between items-end">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs">B</span> 
                      The Pitch
                    </h3>
                    <p className="text-xs text-slate-500">Source material for your Pitch Deck.</p>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl border shadow-sm space-y-5">
                    {PROPOSAL_PITCH_DECK_FIELDS.map((field) => (
                      <div key={field.key} className="space-y-1.5">
                        <Label htmlFor={\ctive-\\} className="text-sm font-semibold text-slate-700 flex justify-between">
                          <span>{field.label} {expandedProposalIndex < 3 && <span className="text-red-500">*</span>}</span>
                        </Label>
                        <Textarea
                          id={\ctive-\\}
                          placeholder={field.placeholder}
                          value={titleProposals[expandedProposalIndex]?.pitchDeck?.[field.key] || ""}
                          onChange={(e) => handlePitchDeckFieldChange(expandedProposalIndex, field.key, e.target.value)}
                          required={expandedProposalIndex < 3}
                          minLength={20}
                          maxLength={1000}
                          rows={3}
                          className="resize-y shadow-sm focus-visible:ring-blue-500/20"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Section C: Academic Details */}
                <section className="space-y-5">
                  <div className="border-b pb-2 flex justify-between items-end">
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500 text-xs">C</span> 
                      Academic Details
                    </h3>
                  </div>
                  
                  <div className="bg-white p-5 rounded-xl border shadow-sm space-y-6">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <Label htmlFor="abstract" className="text-sm font-semibold text-slate-700">Abstract</Label>
                        <span className={\	ext-xs font-medium \\}>
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
                        rows={3}
                        className="shadow-sm focus-visible:ring-blue-500/20"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6 border-slate-100">
                        <div className="flex justify-between items-end">
                          <Label htmlFor="keywords" className="text-sm font-semibold text-slate-700">Keywords</Label>
                          <span className="text-xs text-slate-400">{keywordList.length}/10</span>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            id="keywords"
                            placeholder="Add tag..."
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={handleKeywordKeyDown}
                            className="shadow-sm h-9"
                          />
                          <Button type="button" variant="secondary" onClick={addKeyword} className="h-9">Add</Button>
                        </div>
                        {keywordList.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {keywordList.map((kw) => (
                              <span key={kw} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                                {kw}
                                <button type="button" onClick={() => removeKeyword(kw)} className="text-slate-400 hover:text-slate-600 ml-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 md:border-l md:pl-6 border-slate-100">
                        <Label className="text-sm font-semibold text-slate-700">SDG Tags * (Select 1-5 tags)</Label>
                        <div className="flex gap-2 shadow-sm rounded-md">
                          <select
                            value=""
                            onChange={(e) => addProposalSdgTag(expandedProposalIndex, e.target.value)}
                            className="h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20"
                          >
                            <option value="">Select an SDG tag...</option>
                            {SDG_TAG_SUGGESTIONS.map((tag) => (
                              <option key={tag} value={tag}>{tag}</option>
                            ))}
                          </select>
                        </div>
                        {titleProposals[expandedProposalIndex]?.sdgTags?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {titleProposals[expandedProposalIndex].sdgTags.map((tag) => (
                              <span key={tag} className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] font-bold border border-emerald-200">
                                {tag}
                                <button type="button" onClick={() => removeProposalSdgTag(expandedProposalIndex, tag)} className="text-emerald-500 hover:text-emerald-700 ml-0.5">
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

          {/* Column 2: Sticky Footer Overlay */}
          <div className="absolute bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur px-6 py-4 shadow-[0_-15px_40px_-20px_rgba(0,0,0,0.15)] z-20">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                className="text-slate-600 font-semibold"
                onClick={() => handleSaveProposalDraft(expandedProposalIndex)}
              >
                <Save className="mr-2 h-4 w-4" /> Save Draft 
              </Button>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Button 
                  type="button" 
                  variant="outline"
                  className="font-semibold shadow-sm w-full sm:w-auto bg-white"
                  onClick={() => generateDeck(expandedProposalIndex, titleProposals[expandedProposalIndex])}
                  disabled={generatingProposalIndex === expandedProposalIndex}
                >
                  {generatingProposalIndex === expandedProposalIndex ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> ...</>
                  ) : "Generate Deck (PDF)"}
                </Button>
                
                {/* Submit All Action inside the Form wrapper or outside trigger */}
                <Button 
                  type="submit" 
                  form="project-form"
                  className="font-bold relative overflow-hidden group shadow-sm bg-slate-900 text-white hover:bg-slate-800 w-full sm:w-auto"
                  disabled={createProject.isPending || needsTeamFinalization}
                >
                  {createProject.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  <span>Submit {titleProposals.length} Proposals</span>
                </Button>
              </div>
            </div>
          </div>
        </main>

        {/* Column 3: Right Panel (Analysis & Similarity) */}
        <aside className="w-80 flex-none border-l bg-slate-50 flex flex-col z-10 shadow-[inner_2px_0_10px_rgba(0,0,0,0.02)]">
          <div className="p-5 border-b bg-white">
            <h2 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <span className="flex h-5 w-5 bg-blue-100 text-blue-700 rounded items-center justify-center"><Search className="h-3 w-3" /></span> 
              Similarity Report
            </h2>
            <p className="text-[11px] text-slate-500 mt-1.5 font-medium">Cross-checking internet & university archives.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
            
            <Button 
              type="button" 
              onClick={() => scanSimilarity(expandedProposalIndex, titleProposals[expandedProposalIndex])}
              disabled={isScanningSimilarityIndex === expandedProposalIndex}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 shadow-sm"
            >
              {isScanningSimilarityIndex === expandedProposalIndex ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
              ) : "Scan Live Proposal"}
            </Button>

            {proposalSimilarityResults[expandedProposalIndex] && proposalSimilarityResults[expandedProposalIndex].length > 0 ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200/50">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"></span>
                  <h3 className="font-bold text-red-900 text-xs tracking-tight uppercase">Similarity Found</h3>
                </div>
                
                <div className="space-y-3">
                  {proposalSimilarityResults[expandedProposalIndex].map((match, i) => (
                    <div key={match._id || i} className="bg-white rounded-lg p-3 border border-red-100 shadow-sm">
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Match #{i + 1}</span>
                        <span className="text-[10px] font-extrabold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-full border border-red-200">
                          {Math.round(match.score * 100)}% Match
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 leading-snug mb-2 line-clamp-2">
                        "{match.title}"
                      </div>
                      <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded">
                        Status: <span className="font-semibold text-slate-700">{match.status || "Archived"}</span> 
                        {match.academicYear && \ • \\}
                      </div>
                    </div>
                  ))}

                  <div className="mt-2 p-2 bg-red-100/50 rounded-lg">
                    <p className="text-[11px] text-red-800 font-medium">
                       Overlap detected. Focus on your <span className="font-bold">Unique Contribution</span> to differentiate this pitch.
                    </p>
                  </div>
                </div>
              </div>
            ) : proposalSimilarityResults[expandedProposalIndex] ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-emerald-200/50">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="font-bold text-emerald-900 text-xs tracking-tight uppercase">Safe</h3>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Scan complete. No highly similar archived documents found.
                </p>
              </div>
            ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-100/50 p-6 text-center shadow-inner">
                  <Search className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                  <p className="text-[11px] text-slate-500 font-medium">Click scan to check against archives.</p>
                </div>
            )}
            
            <div className="pt-4 border-t border-slate-200">
              <h3 className="text-[10px] font-bold text-slate-400 mb-3 uppercase tracking-wider">Fast Scan (Title Only)</h3>
              <div className="bg-white rounded-lg border shadow-sm p-3">
                {titleProposals[expandedProposalIndex]?.title ? (
                  <TitleSimilarityChecker
                    title={titleProposals[expandedProposalIndex].title}
                    keywords={keywordList}
                    debounceMs={500}
                  />
                ) : (
                  <p className="text-[10px] text-center text-slate-400 italic">Waiting for title...</p>
                )}
              </div>
            </div>

          </div>
        </aside>
        
      </div>
    </DashboardLayout>
  );
}\;

fs.writeFileSync(path, text.substring(0, startIndex) + newJsx);
console.log('SUCCESS');
