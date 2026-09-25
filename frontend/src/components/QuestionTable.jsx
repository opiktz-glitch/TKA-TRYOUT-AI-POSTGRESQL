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
                                #{question.id} · {getSubjectName(question.subject_id)}
                              </div>

                              {question.has_image && (
                                <span className="score-badge is-image" style={{ marginTop: "4px" }}>
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

                              <div className="score-secondary" style={{ marginTop: "4px" }}>
                                {(question.explanation || "").trim() ? (
                                  <span className="score-badge is-complete">Lengkap</span>
                                ) : (
                                  <span className="score-badge is-incomplete">Tidak Lengkap</span>
                                )}
                              </div>
                            </td>

                            <td className="is-center is-nowrap">
                              <div className="action-buttons" style={{ justifyContent: "center" }}>
                                <button
                                  className="review-button"
                                  title="Preview Soal"
                                  onClick={() => openPreviewModal(question)}
                                >
                                  <IconEye size={16} />
                                </button>

                                <button
                                  className="edit-button"
                                  onClick={() => openEditModal(question)}
                                  title="Edit"
                                >
                                  <IconEdit size={16} />
                                </button>

                                {canDeleteQuestion(question) && (
                                  <button
                                    className="delete-button"
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
