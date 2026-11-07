import React from "react";
import { IconEye, IconEdit, IconTrash } from "./Icons";

export default function QuestionTable({
  paginatedQuestions,
  getSubjectName,
  getDifficultyLabel,
  openPreviewModal,
  openEditModal,
  canDeleteQuestion,
  handleDelete,
  deletingId
}) {
  return (
                  <div className="table-container">
                    <table className="score-table">
                      <colgroup>
                        <col style={{ width: "44%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "10%" }} />
                        <col style={{ width: "14%" }} />
                        <col style={{ width: "18%" }} />
                      </colgroup>

                      <thead>
                        <tr>
                          <th className="is-left">Soal</th>
                          <th>Tingkat</th>
                          <th>Bobot</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedQuestions.map((question) => (
                          <tr key={question.id}>
                            <td>
                              <div
                                className="score-primary is-strong score-ellipsis"
                                title={question.question_text}
                              >
                                {question.question_text}
                              </div>
                              <div className="score-secondary score-ellipsis">
                                #{question.id} · {getSubjectName(question.subject_id)} · {question.question_type === 'TRUE_FALSE' ? 'PGK-Kategori' : question.question_type === 'MULTIPLE_RESPONSE' ? 'PGK-MCMA' : 'PG'}
                              </div>

                              {question.has_image && (
                                <span className="score-badge is-image management-badge-spaced">
                                  Bergambar
                                </span>
                              )}
                            </td>

                            <td className="is-center is-nowrap">
                              <span
                                className={`score-badge is-${(question.difficulty || "").toLowerCase()}`}
                              >
                                {getDifficultyLabel(question.difficulty)}
                              </span>
                            </td>

                            <td className="is-center is-nowrap">
                              <span className="score-value">{question.points}</span>
                            </td>

                            <td className="is-center">
                              {question.is_active ? (
                                <span className="score-badge is-pass">Aktif</span>
                              ) : (
                                <span className="score-badge is-fail">Nonaktif</span>
                              )}

                              <div className="score-secondary management-status-detail">
                                {(question.explanation || "").trim() ? (
                                  <span className="score-badge is-complete">Lengkap</span>
                                ) : (
                                  <span className="score-badge is-incomplete">Tidak Lengkap</span>
                                )}
                              </div>
                            </td>

                            <td className="is-center is-nowrap">
                              <div className="action-buttons management-table-actions">
                                <button
                                  type="button"
                                  className="review-button"
                                  aria-label={`Preview soal ${question.question_text?.slice(0, 60) || ""}`}
                                  title="Preview Soal"
                                  onClick={() => openPreviewModal(question)}
                                >
                                  <IconEye size={16} />
                                </button>

                                <button
                                  type="button"
                                  className="edit-button"
                                  aria-label={`Edit soal ${question.question_text?.slice(0, 60) || ""}`}
                                  onClick={() => openEditModal(question)}
                                  title="Edit"
                                >
                                  <IconEdit size={16} />
                                </button>

                                {canDeleteQuestion(question) && (
                                  <button
                                    type="button"
                                    className="delete-button"
                                    aria-label={`Hapus soal ${question.question_text?.slice(0, 60) || ""}`}
                                    onClick={() => handleDelete(question)}
                                    disabled={deletingId === question.id}
                                    title="Hapus"
                                  >
                                    <IconTrash size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

  );
}
