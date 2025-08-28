import React, { useState, useEffect } from "react";
import { 
  Tag as TagIcon, 
  Search, 
  Download, 
  Upload, 
  Trash2, 
  Filter,
  Eye,
  EyeOff,
  Copy,
  Check
} from "lucide-react";
import { Tag, tagManager } from "../services/TagManager";

const TagManagerPage: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState("");
  const [copiedTagId, setCopiedTagId] = useState<string | null>(null);

  // Predefined color options
  const colorOptions = [
    { value: "", label: "All Colors" },
    { value: "#3b82f6", label: "Blue", color: "#3b82f6" },
    { value: "#ef4444", label: "Red", color: "#ef4444" },
    { value: "#10b981", label: "Green", color: "#10b981" },
    { value: "#f59e0b", label: "Amber", color: "#f59e0b" },
    { value: "#8b5cf6", label: "Purple", color: "#8b5cf6" },
    { value: "#06b6d4", label: "Cyan", color: "#06b6d4" },
    { value: "#f97316", label: "Orange", color: "#f97316" },
    { value: "#ec4899", label: "Pink", color: "#ec4899" },
    { value: "#84cc16", label: "Lime", color: "#84cc16" },
    { value: "#6366f1", label: "Indigo", color: "#6366f1" },
  ];

  const typeOptions = [
    { value: "", label: "All Types" },
    { value: "address", label: "Address" },
    { value: "contract", label: "Contract" },
    { value: "transaction", label: "Transaction" },
    { value: "block", label: "Block" },
  ];

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, searchTerm, selectedColor, selectedType]);

  const loadTags = () => {
    const allTags = tagManager.getAllTags();
    setTags(allTags);
  };

  const filterTags = () => {
    let filtered = [...tags];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(tag => 
        tag.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tag.nodeId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by color
    if (selectedColor) {
      filtered = filtered.filter(tag => tag.color === selectedColor);
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(tag => tag.nodeType === selectedType);
    }

    setFilteredTags(filtered);
  };

  const handleRemoveTag = (tagId: string) => {
    if (tagManager.removeTag(tagId)) {
      loadTags();
    }
  };

  const handleRemoveAllTags = () => {
    if (window.confirm("Are you sure you want to remove all tags? This action cannot be undone.")) {
      tagManager.clearAllTags();
      loadTags();
    }
  };

  const handleExportTags = () => {
    const exportData = tagManager.exportTags();
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chainhound-tags-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  const handleImportTags = () => {
    if (tagManager.importTags(importData)) {
      loadTags();
      setShowImportModal(false);
      setImportData("");
      alert("Tags imported successfully!");
    } else {
      alert("Failed to import tags. Please check the JSON format.");
    }
  };

  const copyTagToClipboard = async (tag: Tag) => {
    const tagInfo = `Node: ${tag.nodeId}\nType: ${tag.nodeType}\nTag: ${tag.text}\nColor: ${tag.color}`;
    try {
      await navigator.clipboard.writeText(tagInfo);
      setCopiedTagId(tag.id);
      setTimeout(() => setCopiedTagId(null), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  const getNodeDisplayName = (tag: Tag) => {
    const nodeId = tag.nodeId;
    if (tag.nodeType === "block") {
      return `Block ${nodeId.replace("block-", "")}`;
    } else if (tag.nodeType === "transaction") {
      return `Transaction ${nodeId.replace("tx-", "").slice(0, 8)}`;
    } else if (tag.nodeType === "address" || tag.nodeType === "contract") {
      return `${tag.nodeType === "contract" ? "Contract" : "Address"} ${nodeId.replace("addr-", "").slice(0, 8)}`;
    }
    return nodeId;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-gray-800 rounded-lg shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <TagIcon className="h-8 w-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Tag Manager</h1>
              <p className="text-gray-400">Manage and export node tags for forensic analysis</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Import</span>
            </button>
            <button
              onClick={handleRemoveAllTags}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tags or nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
              />
            </div>

            {/* Color Filter */}
            <select
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              {colorOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center justify-center px-4 py-2 bg-gray-700 rounded text-gray-300">
              {filteredTags.length} of {tags.length} tags
            </div>
          </div>
        </div>

        {/* Tags List */}
        <div className="p-6">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No tags found</p>
              <p className="text-gray-500">Try adjusting your search filters or add some tags to nodes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Color indicator */}
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    
                    {/* Tag content */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-white font-medium">{tag.text}</span>
                        <span className="px-2 py-1 text-xs bg-gray-600 rounded text-gray-300">
                          {tag.nodeType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400 font-mono">
                        {getNodeDisplayName(tag)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Created: {formatDate(tag.createdAt)}
                        {tag.updatedAt !== tag.createdAt && ` • Updated: ${formatDate(tag.updatedAt)}`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => copyTagToClipboard(tag)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                      title="Copy tag info"
                    >
                      {copiedTagId === tag.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Remove tag"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Export Tags</h3>
            <p className="text-gray-400 mb-4">
              Export all tags as a JSON file for backup or sharing.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleExportTags}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Export
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Import Tags</h3>
            <p className="text-gray-400 mb-4">
              Import tags from a JSON file. This will replace all existing tags.
            </p>
            <textarea
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              placeholder="Paste JSON data here..."
              className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 resize-none"
            />
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleImportTags}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportData("");
                }}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManagerPage;
