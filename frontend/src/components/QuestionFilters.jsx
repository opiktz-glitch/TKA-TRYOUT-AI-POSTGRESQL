import React from 'react';

export default function QuestionFilters({
  search, setSearch, subjectFilter, setSubjectFilter, subjects, showAdvancedFilter, setShowAdvancedFilter, difficultyFilter, setDifficultyFilter, statusFilter, setStatusFilter, explanationFilter, setExplanationFilter, hasImageFilter, setHasImageFilter, DIFFICULTIES
}) {
  return (
            <div className="question-filter" style={{ marginBottom: 0, padding: "12px 14px 12px", borderBottom: "1px solid #e5e7eb" }}>
              <div className="question-filter-row question-filter-row-primary">
                <div className="filter-group">
                  <input
                    type="text"
                    placeholder="Cari pertanyaan..."
                    className="search-input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="filter-group">
                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Semua Mata Pelajaran</option>

                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="filter-advanced-toggle"
                onClick={() => setShowAdvancedFilter((prev) => !prev)}
              >
                Filter lanjutan {showAdvancedFilter ? "▴" : "▾"}
              </button>

              <div
                className={`question-filter-row question-filter-row-advanced${
                  showAdvancedFilter ? " is-open" : ""
                }`}
              >
                <div className="filter-group">
                  <select
                    value={difficultyFilter}
                    onChange={(e) => setDifficultyFilter(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Semua Tingkat</option>

                    {DIFFICULTIES.map((difficulty) => (
                      <option key={difficulty.value} value={difficulty.value}>
                        {difficulty.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Semua Status</option>

                    <option value="ACTIVE">Aktif</option>

                    <option value="INACTIVE">Tidak Aktif</option>
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={explanationFilter}
                    onChange={(e) => setExplanationFilter(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Semua Penjelasan</option>

                    <option value="COMPLETE">Lengkap</option>

                    <option value="INCOMPLETE">Belum Lengkap</option>
                  </select>
                </div>

                <div className="filter-group">
                  <select
                    value={hasImageFilter}
                    onChange={(e) => setHasImageFilter(e.target.value)}
                    className="search-input"
                  >
                    <option value="">Semua Gambar</option>

                    <option value="WITH_IMAGE">Ada Gambar</option>

                    <option value="WITHOUT_IMAGE">Tanpa Gambar</option>
                  </select>
                </div>
              </div>
            </div>

  );
}
