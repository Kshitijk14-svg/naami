"use client";

import React from "react";

export interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}

interface Props<T extends { id: number | string }> {
  columns: Column<T>[];
  rows: T[];
  onAdd?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  isLoading?: boolean;
  addLabel?: string;
}

export function CrudTable<T extends { id: number | string }>({
  columns,
  rows,
  onAdd,
  onEdit,
  onDelete,
  isLoading,
  addLabel = "Add New",
}: Props<T>) {
  const handleDelete = (row: T) => {
    if (window.confirm("Delete this item? This cannot be undone.")) {
      onDelete?.(row);
    }
  };

  return (
    <div style={{ borderLeft: "3px solid #8B1A1A" }}>
      {/* Table header bar */}
      <div
        className="flex items-center justify-between"
        style={{ padding: "12px 20px", borderBottom: "1px solid rgba(17,17,17,0.06)", backgroundColor: "#EDE8DC" }}
      >
        <span />
        {onAdd && (
          <button
            onClick={onAdd}
            className="font-sans font-bold uppercase tracking-[0.2em] hover:opacity-70 transition-opacity"
            style={{
              fontSize: "9px",
              color: "#F4F0E6",
              backgroundColor: "#8B1A1A",
              padding: "7px 16px",
              letterSpacing: "0.18em",
              cursor: "pointer",
            }}
          >
            + {addLabel}
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#EDE8DC" }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left font-sans font-bold uppercase"
                  style={{
                    fontSize: "8.5px",
                    letterSpacing: "0.2em",
                    color: "rgba(17,17,17,0.5)",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(17,17,17,0.07)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.label}
                </th>
              ))}
              {(onEdit || onDelete) && (
                <th
                  className="text-right font-sans font-bold uppercase"
                  style={{
                    fontSize: "8.5px",
                    letterSpacing: "0.2em",
                    color: "rgba(17,17,17,0.5)",
                    padding: "10px 16px",
                    borderBottom: "1px solid rgba(17,17,17,0.07)",
                  }}
                >
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-center font-sans"
                  style={{ padding: "32px", fontSize: "11px", color: "rgba(17,17,17,0.4)" }}
                >
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="text-center font-sans"
                  style={{ padding: "32px", fontSize: "11px", color: "rgba(17,17,17,0.4)", letterSpacing: "0.06em" }}
                >
                  No items yet
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-[rgba(17,17,17,0.02)] transition-colors"
                  style={{ borderBottom: "1px solid rgba(17,17,17,0.05)" }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="font-sans"
                      style={{
                        padding: "12px 16px",
                        fontSize: "12px",
                        color: "#111111",
                        verticalAlign: "middle",
                      }}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "")}
                    </td>
                  ))}
                  {(onEdit || onDelete) && (
                    <td style={{ padding: "12px 16px", textAlign: "right", verticalAlign: "middle" }}>
                      <div className="flex items-center justify-end gap-3">
                        {onEdit && (
                          <button
                            onClick={() => onEdit(row)}
                            className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
                            style={{ fontSize: "8.5px", letterSpacing: "0.14em", color: "#111111", cursor: "pointer" }}
                          >
                            Edit
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => handleDelete(row)}
                            className="font-sans font-bold uppercase hover:opacity-60 transition-opacity"
                            style={{ fontSize: "8.5px", letterSpacing: "0.14em", color: "#8B1A1A", cursor: "pointer" }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
