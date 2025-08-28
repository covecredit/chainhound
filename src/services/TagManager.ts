export interface Tag {
  id: string;
  nodeId: string;
  nodeType: "address" | "contract" | "transaction" | "block";
  text: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaggedNode {
  nodeId: string;
  nodeType: "address" | "contract" | "transaction" | "block";
  tags: Tag[];
}

class TagManager {
  private readonly STORAGE_KEY = "chainhound_node_tags";
  private tags: Map<string, Tag[]> = new Map();

  constructor() {
    this.loadTags();
  }

  /**
   * Load tags from localStorage
   */
  private loadTags(): void {
    try {
      const savedTags = localStorage.getItem(this.STORAGE_KEY);
      if (savedTags) {
        const parsedTags = JSON.parse(savedTags) as Tag[];
        this.tags.clear();
        
        // Group tags by nodeId
        parsedTags.forEach(tag => {
          if (!this.tags.has(tag.nodeId)) {
            this.tags.set(tag.nodeId, []);
          }
          this.tags.get(tag.nodeId)!.push(tag);
        });
      }
    } catch (error) {
      console.error("Failed to load tags from localStorage:", error);
    }
  }

  /**
   * Save tags to localStorage
   */
  private saveTags(): void {
    try {
      const allTags: Tag[] = [];
      this.tags.forEach(tags => {
        allTags.push(...tags);
      });
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allTags));
    } catch (error) {
      console.error("Failed to save tags to localStorage:", error);
    }
  }

  /**
   * Add a tag to a node
   */
  addTag(nodeId: string, nodeType: "address" | "contract" | "transaction" | "block", text: string, color: string): Tag {
    const tag: Tag = {
      id: `${nodeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      nodeId,
      nodeType,
      text,
      color,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    if (!this.tags.has(nodeId)) {
      this.tags.set(nodeId, []);
    }
    this.tags.get(nodeId)!.push(tag);
    this.saveTags();
    
    return tag;
  }

  /**
   * Update an existing tag
   */
  updateTag(tagId: string, text: string, color: string): Tag | null {
    for (const [nodeId, tags] of this.tags.entries()) {
      const tagIndex = tags.findIndex(tag => tag.id === tagId);
      if (tagIndex !== -1) {
        const updatedTag = {
          ...tags[tagIndex],
          text,
          color,
          updatedAt: Date.now()
        };
        tags[tagIndex] = updatedTag;
        this.saveTags();
        return updatedTag;
      }
    }
    return null;
  }

  /**
   * Remove a tag
   */
  removeTag(tagId: string): boolean {
    for (const [nodeId, tags] of this.tags.entries()) {
      const tagIndex = tags.findIndex(tag => tag.id === tagId);
      if (tagIndex !== -1) {
        tags.splice(tagIndex, 1);
        if (tags.length === 0) {
          this.tags.delete(nodeId);
        }
        this.saveTags();
        return true;
      }
    }
    return false;
  }

  /**
   * Get all tags for a specific node
   */
  getTagsForNode(nodeId: string): Tag[] {
    return this.tags.get(nodeId) || [];
  }

  /**
   * Get all tagged nodes
   */
  getAllTaggedNodes(): TaggedNode[] {
    const taggedNodes: TaggedNode[] = [];
    this.tags.forEach((tags, nodeId) => {
      if (tags.length > 0) {
        taggedNodes.push({
          nodeId,
          nodeType: tags[0].nodeType,
          tags
        });
      }
    });
    return taggedNodes;
  }

  /**
   * Get all tags
   */
  getAllTags(): Tag[] {
    const allTags: Tag[] = [];
    this.tags.forEach(tags => {
      allTags.push(...tags);
    });
    return allTags;
  }

  /**
   * Check if a node has any tags
   */
  isNodeTagged(nodeId: string): boolean {
    return this.tags.has(nodeId) && this.tags.get(nodeId)!.length > 0;
  }

  /**
   * Get tag count for a node
   */
  getTagCount(nodeId: string): number {
    return this.tags.get(nodeId)?.length || 0;
  }

  /**
   * Export all tags as JSON
   */
  exportTags(): string {
    return JSON.stringify(this.getAllTags(), null, 2);
  }

  /**
   * Import tags from JSON
   */
  importTags(jsonData: string): boolean {
    try {
      const importedTags = JSON.parse(jsonData) as Tag[];
      
      // Validate the imported data
      if (!Array.isArray(importedTags)) {
        throw new Error("Invalid tag data format");
      }

      // Clear existing tags and import new ones
      this.tags.clear();
      importedTags.forEach(tag => {
        if (!this.tags.has(tag.nodeId)) {
          this.tags.set(tag.nodeId, []);
        }
        this.tags.get(tag.nodeId)!.push(tag);
      });

      this.saveTags();
      return true;
    } catch (error) {
      console.error("Failed to import tags:", error);
      return false;
    }
  }

  /**
   * Clear all tags
   */
  clearAllTags(): void {
    this.tags.clear();
    this.saveTags();
  }

  /**
   * Search tags by text
   */
  searchTags(searchText: string): Tag[] {
    const searchLower = searchText.toLowerCase();
    const results: Tag[] = [];
    
    this.tags.forEach(tags => {
      tags.forEach(tag => {
        if (tag.text.toLowerCase().includes(searchLower)) {
          results.push(tag);
        }
      });
    });
    
    return results;
  }

  /**
   * Get tags by color
   */
  getTagsByColor(color: string): Tag[] {
    const results: Tag[] = [];
    
    this.tags.forEach(tags => {
      tags.forEach(tag => {
        if (tag.color === color) {
          results.push(tag);
        }
      });
    });
    
    return results;
  }
}

// Export singleton instance
export const tagManager = new TagManager();
