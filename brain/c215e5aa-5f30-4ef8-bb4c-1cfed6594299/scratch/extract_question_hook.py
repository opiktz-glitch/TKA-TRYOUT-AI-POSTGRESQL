import os

jsx_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\pages\QuestionManagement.jsx'
with open(jsx_path, 'r', encoding='utf-8') as f:
    text = f.read()

return_idx = text.find('  return (\n    <div className="app-layout">')
if return_idx == -1:
    print('Could not find main return')
    exit(1)

body_start_idx = text.find('function QuestionManagement() {')
if body_start_idx == -1:
    print('Could not find function start')
    exit(1)

body = text[body_start_idx:return_idx]
body_inner = body.split('function QuestionManagement() {\n')[1].rstrip()

vars_to_export = ['QUESTIONS_PER_PAGE', 'actionError', 'actionSuccess', 'aiConsistencyWarning', 'aiError', 'aiForm', 'aiGate', 'aiGeneratedNotice', 'aiGenerating', 'aiImageDescription', 'aiPrompt', 'aiPromptLoading', 'aiReplaceMode', 'aiStep', 'canDeleteQuestion', 'closeAiModal', 'closeModal', 'closePreviewModal', 'createEmptyAiForm', 'createEmptyForm', 'createdQuestionIdRef', 'currentPage', 'deletingId', 'difficultyFilter', 'editAiGate', 'editingQuestion', 'explanationFilter', 'filteredQuestions', 'form', 'formError', 'formSuccess', 'getDifficultyLabel', 'getSubjectName', 'handleAiFormChange', 'handleAiGenerate', 'handleBackToAiForm', 'handleChange', 'handleCorrectAnswer', 'handleDelete', 'handleImageFileChange', 'handleImported', 'handleImportedFromImage', 'handleOptionTextChange', 'handleRemoveImageClick', 'handleShowPrompt', 'handleSubmit', 'hasActiveQuestionFilter', 'hasImageFilter', 'imageActionError', 'imagePreviewUrl', 'importGate', 'loadError', 'loadQuestions', 'loadSubjects', 'loading', 'onlyMine', 'openAddModal', 'openAiModal', 'openAiModalForEdit', 'openEditModal', 'openPreviewModal', 'paginatedQuestions', 'previewQuestion', 'questions', 'removeExistingImage', 'resetQuestionFilters', 'saving', 'search', 'selectedImageFile', 'setActionError', 'setActionSuccess', 'setAiConsistencyWarning', 'setAiError', 'setAiForm', 'setAiGeneratedNotice', 'setAiGenerating', 'setAiImageDescription', 'setAiPrompt', 'setAiPromptLoading', 'setAiReplaceMode', 'setAiStep', 'setCurrentPage', 'setDeletingId', 'setDifficultyFilter', 'setEditingQuestion', 'setExplanationFilter', 'setForm', 'setFormError', 'setFormSuccess', 'setHasImageFilter', 'setImageActionError', 'setImagePreviewUrl', 'setLoadError', 'setLoading', 'setOnlyMine', 'setPreviewQuestion', 'setQuestions', 'setRemoveExistingImage', 'setSaving', 'setSearch', 'setSelectedImageFile', 'setShowAdvancedFilter', 'setShowAiModal', 'setShowGuideModal', 'setShowImportModal', 'setShowModal', 'setStatusFilter', 'setSubjectFilter', 'setSubjects', 'setTotalQuestions', 'showAdvancedFilter', 'showAiModal', 'showGuideModal', 'showImportModal', 'showModal', 'statusFilter', 'subjectFilter', 'subjects', 'totalPages', 'totalQuestions', 'user', 'validateForm']

hook_imports = """import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getSubjects,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion as deleteQuestionApi,
  uploadQuestionImage,
  deleteQuestionImage,
  generateAIQuestion,
  previewAIPrompt,
} from "../services/api";
import { useAuth } from "../auth/AuthContext";
import useAiStatusGate from "./useAiStatusGate";
"""

hook_content = hook_imports + "\n" + "export function useQuestionManagement(OPTION_CODES, DIFFICULTIES) {\n" + body_inner + "\n  return {\n    " + ",\n    ".join(vars_to_export) + "\n  };\n}\n"

hook_path = r'c:\Projects\TKA-TryOut-AI-Postgresql\frontend\src\hooks\useQuestionManagement.js'
os.makedirs(os.path.dirname(hook_path), exist_ok=True)
with open(hook_path, 'w', encoding='utf-8') as f:
    f.write(hook_content)

new_imports = """import React from "react";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import Pagination from "../components/Pagination";
import QuestionFilters from "../components/QuestionFilters";
import QuestionTable from "../components/QuestionTable";
import "../components/ScoreTable.css";
import { IconCheck } from "../components/Icons";
import PanduanSoalModal from "../components/PanduanSoalModal";
import AiPromptModal from "../components/AiPromptModal";
import QuestionFormModal from "../components/QuestionFormModal";
import QuestionPreviewModal from "../components/QuestionPreviewModal";
import ImportDocumentModal from "../components/ImportDocumentModal";
import { OPTION_CODES, DIFFICULTIES } from "../data/questionConstants";
import { useQuestionManagement } from "../hooks/useQuestionManagement";

function QuestionManagement() {
"""

destructure_vars = "  const {\n    " + ",\n    ".join(vars_to_export) + "\n  } = useQuestionManagement(OPTION_CODES, DIFFICULTIES);\n\n"

rest_of_file = text[return_idx:]

new_jsx_content = new_imports + destructure_vars + rest_of_file

with open(jsx_path, 'w', encoding='utf-8') as f:
    f.write(new_jsx_content)

print('Hook extracted successfully')
