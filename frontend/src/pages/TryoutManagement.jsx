import React from "react";
import TryoutTable from "../components/TryoutTable";
import TryoutFormWizardModal from "../components/TryoutFormWizardModal";
import TryoutReviewModal from "../components/TryoutReviewModal";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import "../components/TryoutWizard.css";
import { useTryoutManagement } from "../hooks/useTryoutManagement";

const DIFFICULTIES = [
  { value: "EASY", label: "Mudah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HARD", label: "Sulit" },
];

function TryoutManagement() {
  const {
    user,
    defaultBankScope,
    tryouts,
    subjects,
    search,
    setSearch,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    onlyMine,
    setOnlyMine,
    currentPage,
    setCurrentPage,
    TRYOUTS_PER_PAGE,
    loading,
    deletingId,
    showModal,
    wizardStep,
    editingTryout,
    saving,
    form,
    setForm,
    bulkPoints,
    setBulkPoints,
    showReviewModal,
    hasActiveTryoutFilter,
    filteredTryouts,
    totalPages,
    paginatedTryouts,
    totalPoints,
    difficultyBreakdown,
    getSubjectName,
    getDifficultyLabel,
    resetTryoutFilters,
    openModal,
    closeModal,
    goToStep,
    handleChange,
    applyBulkPoints,
    openEditModal,
    openReviewModal,
    closeReviewModal,
    handleSubmit,
    handleDelete,
    handlePrintReview,
    loadingReview,
    reviewError,
    reviewData,
    reviewTab,
    setReviewTab
  } = useTryoutManagement(DIFFICULTIES);

  return (
    <div className="app-layout">
      <Sidebar />

      <main className="main-content">
        <Header />

        <div className="content">
          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <div className="page-header">
            <div>
              <h1>Paket Tryout</h1>
              <p>Kelola paket tryout TKA</p>
            </div>

            <button className="primary-button" onClick={openModal}>
              + Tambah Tryout
            </button>
          </div>

          <TryoutTable
            search={search} setSearch={setSearch}
            subjectFilter={subjectFilter} setSubjectFilter={setSubjectFilter} subjects={subjects}
            statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            loading={loading} showModal={showModal}
            filteredTryouts={filteredTryouts} user={user} onlyMine={onlyMine} setOnlyMine={setOnlyMine}
            hasActiveTryoutFilter={hasActiveTryoutFilter} resetTryoutFilters={resetTryoutFilters}
            paginatedTryouts={paginatedTryouts} getSubjectName={getSubjectName}
            openEditModal={openEditModal} openReviewModal={openReviewModal} handleDelete={handleDelete} deletingId={deletingId}
            currentPage={currentPage} totalPages={totalPages} TRYOUTS_PER_PAGE={TRYOUTS_PER_PAGE} setCurrentPage={setCurrentPage}
          />
        </div>
      </main>

      <TryoutFormWizardModal
        showModal={showModal}
        closeModal={closeModal}
        wizardStep={wizardStep}
        goToStep={goToStep}
        editingTryout={editingTryout}
        saving={saving}
        form={form}
        handleChange={handleChange}
        setForm={setForm}
        handleSubmit={handleSubmit}
        subjects={subjects}
        totalPoints={totalPoints}
        difficultyBreakdown={difficultyBreakdown}
        getSubjectName={getSubjectName}
        getDifficultyLabel={getDifficultyLabel}
        bulkPoints={bulkPoints}
        setBulkPoints={setBulkPoints}
        applyBulkPoints={applyBulkPoints}
        DIFFICULTIES={DIFFICULTIES}
        defaultBankScope={defaultBankScope}
      />

      <TryoutReviewModal
        showReviewModal={showReviewModal}
        closeReviewModal={closeReviewModal}
        handlePrintReview={handlePrintReview}
        loadingReview={loadingReview}
        reviewError={reviewError}
        reviewData={reviewData}
        reviewTab={reviewTab}
        setReviewTab={setReviewTab}
      />
    </div>
  );
}

export default TryoutManagement;