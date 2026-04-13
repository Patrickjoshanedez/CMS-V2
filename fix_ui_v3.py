import sys

path = 'client/src/pages/projects/CreateProjectPage.jsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

start_pattern = "return (\n    <DashboardLayout>"
if start_pattern not in text:
    print("Could not find return statement")
    sys.exit(1)

start_idx = text.find(start_pattern)

new_return = """return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        {/* Global Header */}
        <div className="mb-6 flex flex-col justify-between space-y-2 border-b pb-4 sm:flex-row sm:items-center sm:space-y-0">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Create Capstone Project</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                🟡 Draft (Auto-saves)
              </Badge>
              <span>System Note: Automatically using academic year and section.</span>
            </div>
          </div>
          <div>
            <Button onClick={handleSubmit} disabled={createProject.isPending || needsTeamFinalization}>
              {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Project
            </Button>
          </div>
        </div>

        {createProject.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {createProject.error?.response?.data?.error?.message ||
                createProject.error?.message ||
                'Failed to create project'}
            </AlertDescription>
          </Alert>
        )}

        {similarProjects && similarProjects.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <p className="mb-2 font-medium">Similar projects found:</p>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {similarProjects.map((sp) => (
                  <li key={sp.projectId}>
                    <span className="font-medium">{sp.title}</span>{' '}
                    <span className="text-muted-foreground">
                      — {Math.round(sp.score * 100)}% similar
                    </span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {needsTeamFinalization && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Finalize and lock your team first. Proposal submission is only available after
              your team has been completed.
            </AlertDescription>
          </Alert>
        )}

        {/* Global Details - Grouped at the top before proposals instead of the bottom 
            Wait, prompt says "Main Navigation: Large tabs for Proposals..." 
            so we jump right to the proposals, and we can keep Global fields nicely grouped below them. */}
            
        {/* Main Navigation (Proposal Tabs) */}
        <div className="flex flex-wrap items-center gap-2 border-b">
          {titleProposals.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveProposalIndex(i); setActiveSubTab('write'); }}
              className={cn("px-4 py-3 border-b-2 font-medium text-sm transition-colors -mb-px",
                activeProposalIndex === i ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              Proposal {i + 1}
            </button>
          ))}
          <button 
            type="button"
            disabled={titleProposals.length >= 10}
            onClick={() => { addTitleProposal(); setActiveProposalIndex(titleProposals.length); setActiveSubTab('write'); }}
            className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 flex items-center -mb-px"
          >
            <Plus className="mr-1 h-4 w-4"/> Add Proposal
          </button>
        </div>

        {/* Active Proposal View */}
        {titleProposals[activeProposalIndex] && (() => {
          const index = activeProposalIndex;
          const proposal = titleProposals[index];
          
          return (
            <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
              {/* Sub-Navigation (Action Tabs) */}
              <div className="flex gap-2 border-b bg-muted/20 p-2 overflow-x-auto w-full whitespace-nowrap">
                <button 
                  type="button"
                  onClick={() => setActiveSubTab('write')} 
                  className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeSubTab === 'write' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
                >
                  📝 Write Proposal
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveSubTab('similarity')} 
                  className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2", activeSubTab === 'similarity' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
                >
                  🔍 Similarity Report
                  {proposalSimilarityResults[index]?.length > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">{proposalSimilarityResults[index].length}</Badge>}
                  {proposalSimilarityResults[index]?.length === 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px] bg-green-100 text-green-800 hover:bg-green-100">0</Badge>}
                </button>
                <button 
                  type="button"
                  onClick={() => setActiveSubTab('pitch')} 
                  className={cn("px-4 py-1.5 rounded-md text-sm font-medium transition-all", activeSubTab === 'pitch' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground')}
                >
                  📊 Pitch Deck Builder
                </button>
                
                <div className="ml-auto flex items-center pr-2">
                  {titleProposals.length > 3 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTitleProposal(index)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                    >
                      Delete Proposal
                    </Button>
                  )}
                </div>
              </div>

              <div className="p-0">
                {activeSubTab === 'write' && (
                  <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
                    {/* Basic Details */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">Basic Details</h4>
                      <div className="space-y-2">
                        <Label htmlFor={`proposal-${index}-title`}>
                          Proposal Title *
                        </Label>
                        <Input
                          id={`proposal-${index}-title`}
                          placeholder="Enter a descriptive title for this proposal"
                          value={proposal.title}
                          onChange={(e) => handleTitleProposalChange(index, 'title', e.target.value)}
                          required={index < 3}
                          minLength={10}
                          maxLength={300}
                          className="text-lg"
                        />
                      </div>
                      
                      {/* Real-time Title Similarity Checking mini-alert */}
                      {proposal.title && (
                        <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 p-3">
                          <p className="text-xs font-medium text-blue-900">
                            Title Similarity Check 
                          </p>
                          <TitleSimilarityChecker
                            title={proposal.title}
                            keywords={keywordList}
                            debounceMs={500}
                          />
                        </div>
                      )}
                    </div>

                    {/* Core Pitch */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">The Core Pitch</h4>
                      {PROPOSAL_PITCH_DECK_FIELDS.map((field) => (
                        <div key={`${index}-${field.key}`} className="space-y-1">
                          <Label htmlFor={`proposal-${index}-${field.key}`} className="text-sm">
                            {field.label} {index < 3 && '*'}
                          </Label>
                          <Textarea
                            id={`proposal-${index}-${field.key}`}
                            placeholder={field.placeholder}
                            value={proposal.pitchDeck?.[field.key] || ''}
                            onChange={(event) => handlePitchDeckFieldChange(index, field.key, event.target.value)}
                            required={index < 3}
                            minLength={20}
                            maxLength={1000}
                            rows={3}
                            className="resize-y"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Academic Classifications */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-lg border-b pb-2 text-foreground/90">Academic Classifications</h4>
                      <div className="space-y-2">
                        <Label htmlFor={`proposal-${index}-capstoneType`}>
                          Capstone Type *
                        </Label>
                        <TagInput
                          id={`proposal-${index}-capstoneType`}
                          placeholder="Select or type capstone types"
                          value={proposal.capstoneType || []}
                          onChange={(newTags) => handleTitleProposalChange(index, 'capstoneType', newTags)}
                          suggestions={CAPSTONE_TYPE_SUGGESTIONS}
                          maxTags={5}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">
                          SDG Tags {index < 3 && '*'}
                        </Label>
                        <div className="flex gap-2">
                          <select
                            value=""
                            onChange={(e) => addProposalSdgTag(index, e.target.value)}
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                          >
                            <option value="">Add SDG tag to this proposal</option>
                            {SDG_TAG_SUGGESTIONS.map((tag) => (
                              <option key={`${index}-${tag}`} value={tag}>
                                {tag}
                              </option>
                            ))}
                          </select>
                        </div>
                        {proposal.sdgTags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {proposal.sdgTags.map((tag) => (
                              <span
                                key={`${index}-${tag}`}
                                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                              >
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => removeProposalSdgTag(index, tag)}
                                  className="rounded-full p-0.5 hover:bg-primary/20"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-center pt-8 border-t mt-8">
                       <Button 
                         type="button" 
                         size="lg" 
                         onClick={() => { scanSimilarity(index, proposal); setActiveSubTab('similarity'); }}
                       >
                          Run Similarity Check
                       </Button>
                    </div>
                  </div>
                )}

                {activeSubTab === 'similarity' && (
                  <div className="max-w-3xl mx-auto py-10 px-4 min-h-[400px]">
                     {isScanningSimilarityIndex === index ? (
                        <div className="flex flex-col items-center justify-center space-y-6 py-20">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-muted-foreground font-medium text-lg">Scanning for similarity against past projects...</p>
                        </div>
                     ) : proposalSimilarityResults[index] ? (
                        <div className="space-y-6">
                           <div className="flex justify-between items-center bg-muted/20 p-5 rounded-lg border">
                              <div>
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                  <Search className="h-5 w-5 text-primary" /> Similarity Scan Results
                                </h4>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Found {proposalSimilarityResults[index].length} highly similar projects based on your pitch.
                                </p>
                              </div>
                              <Button type="button" variant="outline" onClick={() => scanSimilarity(index, proposal)}>
                                 <RefreshCw className="mr-2 h-4 w-4" /> Rescan
                              </Button>
                           </div>
                           
                           {proposalSimilarityResults[index].length > 0 ? (
                               <div className="space-y-4 pt-2">
                                  {proposalSimilarityResults[index].map((match) => (
                                    <div key={match._id} className="bg-background p-4 rounded-lg border shadow-sm flex flex-col gap-2">
                                      <div className="font-medium flex justify-between">
                                        <span className="text-base text-foreground">{match.title}</span>
                                        <Badge variant={match.score > 0.4 ? 'destructive' : 'secondary'} className="h-6">
                                          {Math.round(match.score * 100)}% Match
                                        </Badge>
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        <span className="font-semibold">Status:</span> {match.status}
                                      </div>
                                    </div>
                                  ))}
                               </div>
                           ) : (
                               <div className="bg-green-50 text-green-900 border border-green-200 p-8 rounded-lg text-center mt-8">
                                  <div className="mx-auto bg-green-100 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                                     <span className="text-2xl">✨</span>
                                  </div>
                                  <h4 className="text-lg font-bold mb-2">Highly Unique Proposal!</h4>
                                  <p className="text-green-800">No significant matches were found in our database. You're good to go.</p>
                               </div>
                           )}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center justify-center space-y-6 py-20 border-2 border-dashed rounded-xl bg-muted/5">
                           <div className="bg-muted p-4 rounded-full">
                             <Search className="h-10 w-10 text-muted-foreground/60" />
                           </div>
                           <div className="text-center space-y-1">
                             <h4 className="text-lg font-semibold">Ready for Analysis</h4>
                             <p className="text-muted-foreground">Your proposal hasn't been scanned for similarity yet.</p>
                           </div>
                           <Button type="button" size="lg" onClick={() => scanSimilarity(index, proposal)}>
                               ▶ Run Similarity Scan
                           </Button>
                        </div>
                     )}
                  </div>
                )}

                {activeSubTab === 'pitch' && (
                  <div className="max-w-3xl mx-auto py-10 px-4 space-y-8 min-h-[400px]">
                     <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-8 text-center sm:text-left flex flex-col sm:flex-row items-center gap-6">
                        <div className="bg-white p-4 rounded-full shadow-sm">
                           <Download className="h-10 w-10 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xl font-bold text-indigo-950 mb-2">Presentation Deck</h4>
                          <p className="text-indigo-800 mb-0">
                            Generate a beautifully formatted PDF representation of your proposal to use for your initial pitch presentation.
                          </p>
                        </div>
                        <Button 
                          type="button"
                          size="lg"
                          onClick={() => generateDeck(index, proposal)} 
                          disabled={generatingProposalIndex === index} 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shrink-0"
                        >
                            {generatingProposalIndex === index ? (
                              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating PDF...</>
                            ) : (
                              'Generate PDF Deck'
                            )}
                        </Button>
                     </div>
                     
                     <div className="space-y-4">
                        <h4 className="font-semibold text-lg border-b pb-2 pt-4">Proposal Summary Preview</h4>
                        <div className="border rounded-xl p-6 bg-card text-sm space-y-6 shadow-sm">
                           {PROPOSAL_PITCH_DECK_FIELDS.map(f => (
                              <div key={f.key} className="space-y-1">
                                 <div className="font-semibold text-foreground">{f.label}</div>
                                 <div className="text-muted-foreground leading-relaxed">
                                   {proposal.pitchDeck?.[f.key] ? proposal.pitchDeck[f.key] : <span className="italic opacity-60">Not provided</span>}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Global Project Details Grouped At the Bottom */}
        <div className="bg-card border rounded-lg shadow-sm p-6 space-y-6 mt-10">
          <h3 className="text-xl font-bold border-b pb-4">Global Project Attributes</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              {/* Academic Year */}
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  {academicYears.length === 0 && (
                    <option value={defaultAcademicYear}>{defaultAcademicYear}</option>
                  )}
                  {academicYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section */}
              <div className="space-y-2">
                <Label htmlFor="sectionId">Section *</Label>
                {isAnySectionError ? (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center justify-between">
                      <span>Failed to load sections.</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => refetchSections()}
                        disabled={isAnySectionLoading}
                      >
                        Retry
                      </Button>
                    </AlertDescription>
                  </Alert>
                ) : null}
                <select
                  id="sectionId"
                  name="sectionId"
                  value={form.sectionId}
                  onChange={handleChange}
                  required
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  disabled={
                    isAnySectionLoading || (isAnySectionError && sectionOptions.length === 0)
                  }
                >
                  <option value="">
                    {isAnySectionLoading
                      ? 'Loading sections...'
                      : isAnySectionError
                        ? 'Error loading sections'
                        : !form.academicYear
                          ? 'Please select an academic year first'
                          : sectionOptions.length === 0
                            ? 'No active sections available. Contact your instructor to create one.'
                            : 'Select a section'}
                  </option>
                  {sectionOptions.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.courseId?.code} - {section.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Global SDG Tags */}
              <div className="space-y-2">
                <Label htmlFor="sdgTagSelect">Project-Level SDG Tags * (at least 1)</Label>
                <div className="flex gap-2">
                  <select
                    id="sdgTagSelect"
                    value={selectedSdgTag}
                    onChange={(e) => setSelectedSdgTag(e.target.value)}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select an SDG tag</option>
                    {SDG_TAG_SUGGESTIONS.map((tag) => (
                      <option key={tag} value={tag}>
                        {tag}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" onClick={addSdgTag}>
                    Add
                  </Button>
                </div>
                {sdgTagList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {sdgTagList.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeSdgTag(tag)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              {/* Abstract */}
              <div className="space-y-2">
                <Label htmlFor="abstract">Abstract (Optional)</Label>
                <Textarea
                  id="abstract"
                  name="abstract"
                  placeholder="Brief description of your overall project focus"
                  value={form.abstract}
                  onChange={handleChange}
                  maxLength={500}
                  rows={4}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.abstract.length}/500
                </p>
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label htmlFor="keywords">Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    id="keywords"
                    placeholder="Add a keyword and press Enter"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={handleKeywordKeyDown}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={addKeyword}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keywordList.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {keywordList.map((kw) => (
                      <span
                        key={kw}
                        className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="rounded-full p-0.5 hover:bg-primary/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground text-right">{keywordList.length}/10 keywords</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
"""

text = text[:start_idx] + new_return

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("Return block replaced successfully.")
