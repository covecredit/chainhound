import React, { useState, useEffect, useRef } from "react";
import { X, Plus, Edit, Trash2, Tag as TagIcon } from "lucide-react";
import { Tag, tagManager } from "../services/TagManager";

interface TagMenuProps {
  nodeId: string;
  nodeType: "address" | "contract" | "transaction" | "block";
  nodeData?: any;
  position: { x: number; y: number };
  onClose: () => void;
  onTagAdded?: (tag: Tag) => void;
  onTagUpdated?: (tag: Tag) => void;
  onTagRemoved?: (tagId: string) => void;
}

const TagMenu: React.FC<TagMenuProps> = ({
  nodeId,
  nodeType,
  nodeData,
  position,
  onClose,
  onTagAdded,
  onTagUpdated,
  onTagRemoved,
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagText, setEditTagText] = useState("");
  const [editTagColor, setEditTagColor] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Predefined color options
  const colorOptions = [
    "#3b82f6", // Blue
    "#ef4444", // Red
    "#10b981", // Green
    "#f59e0b", // Amber
    "#8b5cf6", // Purple
    "#06b6d4", // Cyan
    "#f97316", // Orange
    "#ec4899", // Pink
    "#84cc16", // Lime
    "#6366f1", // Indigo
  ];

  useEffect(() => {
    // Load existing tags for this node
    const nodeTags = tagManager.getTagsForNode(nodeId);
    setTags(nodeTags);

    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [nodeId, onClose]);

  const handleAddTag = () => {
    if (newTagText.trim()) {
      const tag = tagManager.addTag(nodeId, nodeType, newTagText.trim(), newTagColor);
      setTags(tagManager.getTagsForNode(nodeId));
      setNewTagText("");
      setIsAddingTag(false);
      onTagAdded?.(tag);
    }
  };

  const handleUpdateTag = () => {
    if (editingTagId && editTagText.trim()) {
      const updatedTag = tagManager.updateTag(editingTagId, editTagText.trim(), editTagColor);
      if (updatedTag) {
        setTags(tagManager.getTagsForNode(nodeId));
        setEditingTagId(null);
        setEditTagText("");
        onTagUpdated?.(updatedTag);
      }
    }
  };

  const handleRemoveTag = (tagId: string) => {
    if (tagManager.removeTag(tagId)) {
      setTags(tagManager.getTagsForNode(nodeId));
      onTagRemoved?.(tagId);
    }
  };

  const startEditingTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditTagText(tag.text);
    setEditTagColor(tag.color);
  };

  const cancelEditing = () => {
    setEditingTagId(null);
    setEditTagText("");
    setEditTagColor("");
  };

  const getNodeDisplayName = () => {
    if (nodeType === "block") {
      return `Block ${nodeData?.number || nodeId}`;
    } else if (nodeType === "transaction") {
      return `Transaction ${nodeData?.hash || nodeId}`;
    } else if (nodeType === "address" || nodeType === "contract") {
      return `${nodeType === "contract" ? "Contract" : "Address"} ${nodeData?.address || nodeId}`;
    }
    return nodeId;
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl min-w-80 max-w-96"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
        marginTop: "-10px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600">
        <div className="flex items-center space-x-2">
          <TagIcon className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-gray-200">Tag Node</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Node Info */}
      <div className="p-3 border-b border-gray-600">
        <div className="text-xs text-gray-400 mb-1">Node Details</div>
        <div className="text-sm text-white font-mono break-all leading-relaxed">
          {getNodeDisplayName()}
          {nodeData && (
            <div className="mt-2 space-y-1 text-xs text-gray-300">
              {nodeType === "block" && (
                <>
                  <div>Hash: {nodeData.hash}</div>
                  <div>Timestamp: {nodeData.timestamp}</div>
                </>
              )}
              {nodeType === "transaction" && (
                <>
                  <div>From: {nodeData.from}</div>
                  <div>To: {nodeData.to}</div>
                  <div>Value: {nodeData.value}</div>
                </>
              )}
              {(nodeType === "address" || nodeType === "contract") && (
                <div>Address: {nodeData.address}</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Existing Tags */}
      <div className="p-3 border-b border-gray-600">
        <div className="text-xs text-gray-400 mb-2">Existing Tags</div>
        {tags.length === 0 ? (
          <div className="text-sm text-gray-500 italic">No tags yet</div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                {editingTagId === tag.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editTagText}
                      onChange={(e) => setEditTagText(e.target.value)}
                      className="w-full px-2 py-1 text-sm bg-gray-600 border border-gray-500 rounded text-white"
                      placeholder="Tag text"
                    />
                    <div className="flex space-x-1">
                      {colorOptions.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditTagColor(color)}
                          className={`w-4 h-4 rounded border-2 ${
                            editTagColor === color ? "border-white" : "border-gray-500"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={handleUpdateTag}
                        className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="px-2 py-1 text-xs bg-gray-600 hover:bg-gray-700 rounded text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 flex-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-white">{tag.text}</span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditingTag(tag)}
                        className="p-1 text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Tag */}
      <div className="p-3">
        {isAddingTag ? (
          <div className="space-y-3">
            <input
              type="text"
              value={newTagText}
              onChange={(e) => setNewTagText(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
              placeholder="Enter tag text..."
              onKeyPress={(e) => e.key === "Enter" && handleAddTag()}
              autoFocus
            />
            <div>
              <div className="text-xs text-gray-400 mb-2">Color</div>
              <div className="flex space-x-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded border-2 ${
                      newTagColor === color ? "border-white" : "border-gray-500"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddTag}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
              >
                Add Tag
              </button>
              <button
                onClick={() => {
                  setIsAddingTag(false);
                  setNewTagText("");
                }}
                className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 rounded text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAddingTag(true)}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded text-white transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Tag</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TagMenu;
