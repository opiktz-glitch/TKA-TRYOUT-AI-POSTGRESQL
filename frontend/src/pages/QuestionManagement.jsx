import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Pagination from "../components/Pagination";
import QuestionFilters from "../components/QuestionFilters";
import QuestionTable from "../components/QuestionTable";
import "../components/ScoreTable.css";
import { IconCheck, IconTrash, IconEdit, IconBook, IconEye } from "../components/Icons";
import PanduanSoalModal from "../components/PanduanSoalModal";
import AiPromptModal from "../components/AiPromptModal";
import QuestionFormModal from "../components/QuestionFormModal";
import QuestionPreviewModal from "../components/QuestionPreviewModal";
import ImportDocumentModal from "../components/ImportDocumentModal";
import ImportImageButton from "../components/ImportImageButton";
import QuestionImage from "../components/QuestionImage";
import OptionsEditor from "../components/OptionsEditor";
import ExplanationField from "../components/ExplanationField";
import { OPTION_CODES, DIFFICULTIES } from "../data/questionConstants";
import { useQuestionManagement } from "../hooks/useQuestionManagement";

function QuestionManagement() {
  const {
    QUESTIONS_PER_PAGE,
    aiConsistencyWarning,
    aiError,
    aiForm,
    aiGate,
    aiGeneratedNotice,
    aiGenerating,
    aiImageDescription,
    aiPrompt,
    aiPromptLoading,
    aiReplaceMode,
    aiStep,
    canDeleteQuestion,
    closeAiModal,
    closeModal,
    closePreviewModal,
    createEmptyAiForm,
    createEmptyForm,
    createdQuestionIdRef,
    currentPage,
    deletingId,
    difficultyFilter,
    editAiGate,
    editingQuestion,
    explanationFilter,
    filteredQuestions,
    form,
    getDifficultyLabel,
    getSubjectName,
    handleAiFormChange,
    handleAiGenerate,
    handleBackToAiForm,
    handleChange,
    handleCorrectAnswer,
    handleDelete,
    handleImageFileChange,
    handleImported,
    handleImportedFromImage,
    handleOptionTextChange,
    handleRemoveImageClick,
    handleShowPrompt,
    handleSubmit,
    hasActiveQuestionFilter,
    hasImageFilter,
    imageGate,
    imagePreviewUrl,
    importGate,
    loadQuestions,
    loadSubjects,
    loading,
    onlyMine,
    openAddModal,
    openAiModal,
    openAiModalForEdit,
    openEditModal,
    openPreviewModal,
    paginatedQuestions,
    previewQuestion,
    questions,
    removeExistingImage,
    resetQuestionFilters,
    saving,
    search,
    selectedImageFile,
    setAiConsistencyWarning,
    setAiError,
    setAiForm,
    setAiGeneratedNotice,
    setAiGenerating,
    setAiImageDescription,
    setAiPrompt,
    setAiPromptLoading,
    setAiReplaceMode,
    setAiStep,
    setCurrentPage,
    setDeletingId,
    setDifficultyFilter,
    setEditingQuestion,
    setExplanationFilter,
    setForm,
    setHasImageFilter,
    setImagePreviewUrl,
    setLoading,
    setOnlyMine,
    setPreviewQuestion,
    setQuestions,
    setRemoveExistingImage,
    setSaving,
    setSearch,
    setSelectedImageFile,
    setShowAdvancedFilter,
    setShowAiModal,
    setShowGuideModal,
    setShowImportModal,
    setShowModal,
    setStatusFilter,
    setSubjectFilter,
    setSubjects,
    setTotalQuestions,
    showAdvancedFilter,
    showAiModal,
    showGuideModal,
    showImportModal,
    showModal,
    statusFilter,
    subjectFilter,
    subjects,
    totalPages,
    totalQuestions,
    user,
    validateForm
  } = useQuestionManagement(OPTION_CODES, DIFFICULTIES);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">
          {/* ============================================
              PAGE HEADER
              ============================================ */}

          <div className="page-header">
            <div>
              <h1>Bank Soal</h1>

              <p>Kelola soal TKA Tryout</p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => importGate.run(() => setShowImportModal(true))}
                disabled={importGate.checking}
              >
                {importGate.checking ? "Mengecek AI..." : "📄 Impor dari Dokumen"}
              </button>

              <ImportImageButton gate={imageGate} subjects={subjects} onImported={handleImportedFromImage} />

              <button
                type="button"
                className="secondary-button"
                onClick={() => aiGate.run(openAiModal)}
                disabled={aiGate.checking}
              >
                {aiGate.checking ? "Mengecek AI..." : "✨ Tambah Soal AI"}
              </button>

              <button className="primary-button" onClick={openAddModal}>
                + Tambah Soal
              </button>
            </div>
          </div>

          {/* ============================================
              FILTER & TABLE CARD
              ============================================ */}

          <div className="score-card">
            {/* Filter dibiarkan seperti semula dulu (belum diseragamkan
                dengan score-toolbar milik Paket Tryout) -- lihat
                permintaan TZ. Hanya kartu & tabel di bawah ini yang
                disamakan gayanya. */}
            <QuestionFilters
              search={search}
              setSearch={setSearch}
              subjectFilter={subjectFilter}
              setSubjectFilter={setSubjectFilter}
              subjects={subjects}
              showAdvancedFilter={showAdvancedFilter}
              setShowAdvancedFilter={setShowAdvancedFilter}
              difficultyFilter={difficultyFilter}
              setDifficultyFilter={setDifficultyFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              explanationFilter={explanationFilter}
              setExplanationFilter={setExplanationFilter}
              hasImageFilter={hasImageFilter}
              setHasImageFilter={setHasImageFilter}
              DIFFICULTIES={DIFFICULTIES}
            />

            {loading && questions.length === 0 && (
              <div className="loading-message">Memuat bank soal...</div>
            )}

            {/* Tabel TIDAK disembunyikan saat reload (setelah simpan/hapus/impor)
                selama sudah ada data -- supaya tidak berkedip & posisi scroll
                tidak hilang. Spinner cuma muncul saat pemuatan pertama. */}
            {(!loading || questions.length > 0) && (
              <>
                <div className="score-meta">
                  <div className="score-meta-left">
                    <span>{filteredQuestions.length} soal</span>

                    {user && (
                      <button
                        type="button"
                        className={`filter-toggle${onlyMine ? " is-active" : ""}`}
                        onClick={() => setOnlyMine((prev) => !prev)}
                        aria-pressed={onlyMine}
                      >
                        Soal Saya
                      </button>
                    )}
                  </div>

                  {hasActiveQuestionFilter && (
                    <button type="button" className="score-reset" onClick={resetQuestionFilters}>
                      Reset filter
                    </button>
                  )}
                </div>

                {filteredQuestions.length === 0 ? (
                  <div className="empty-message">
                    {hasActiveQuestionFilter
                      ? "Soal tidak ditemukan."
                      : "Belum ada soal."}
                  </div>
                ) : (
                  <QuestionTable
                    paginatedQuestions={paginatedQuestions}
                    getSubjectName={getSubjectName}
                    getDifficultyLabel={getDifficultyLabel}
                    openPreviewModal={openPreviewModal}
                    openEditModal={openEditModal}
                    canDeleteQuestion={canDeleteQuestion}
                    handleDelete={handleDelete}
                    deletingId={deletingId}
                  />
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredQuestions.length}
                  pageSize={QUESTIONS_PER_PAGE}
                  itemLabel="soal"
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      </main>
      <QuestionFormModal
        showModal={showModal}
        closeModal={closeModal}
        editingQuestion={editingQuestion}
        openAiModalForEdit={openAiModalForEdit}
        handleSubmit={handleSubmit}
        saving={saving}
        aiConsistencyWarning={aiConsistencyWarning}
        aiGeneratedNotice={aiGeneratedNotice}
        form={form}
        handleChange={handleChange}
        subjects={subjects}
        DIFFICULTIES={DIFFICULTIES}
        aiImageDescription={aiImageDescription}
        imagePreviewUrl={imagePreviewUrl}
        removeExistingImage={removeExistingImage}
        handleImageFileChange={handleImageFileChange}
        handleRemoveImageClick={handleRemoveImageClick}
        handleOptionTextChange={handleOptionTextChange}
        handleCorrectAnswer={handleCorrectAnswer}
        IconBook={IconBook}
        setShowGuideModal={setShowGuideModal}
        editAiGate={editAiGate}
      />

      <AiPromptModal
        showAiModal={showAiModal}
        closeAiModal={closeAiModal}
        aiReplaceMode={aiReplaceMode}
        aiGenerating={aiGenerating}
        aiPromptLoading={aiPromptLoading}
        aiStep={aiStep}
        handleShowPrompt={handleShowPrompt}
        aiForm={aiForm}
        handleAiFormChange={handleAiFormChange}
        subjects={subjects}
        aiError={aiError}
        setShowGuideModal={setShowGuideModal}
        handleAiGenerate={handleAiGenerate}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        handleBackToAiForm={handleBackToAiForm}
      />

      {showImportModal && (
        <ImportDocumentModal
          subjects={subjects}
          onClose={() => setShowImportModal(false)}
          onImported={handleImported}
        />
      )}

      {previewQuestion && (
        <QuestionPreviewModal
          question={previewQuestion}
          subjectName={getSubjectName(previewQuestion.subject_id)}
          difficultyLabel={getDifficultyLabel(previewQuestion.difficulty)}
          onClose={closePreviewModal}
        />
      )}

      {showGuideModal && <PanduanSoalModal onClose={() => setShowGuideModal(false)} />}
    </div>
  );
}

export default QuestionManagement;
