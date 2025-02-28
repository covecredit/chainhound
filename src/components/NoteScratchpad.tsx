import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Save, 
  Trash2, 
  Plus, 
  Download, 
  Clock,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { useCaseManager } from '../hooks/useCaseManager';
import { Note } from '../types/case';

const NoteScratchpad: React.FC = () => {
  const { activeCase, addNote, updateNote, deleteNote, createCase } = useCaseManager();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  
  // Update notes when active case changes
  useEffect(() => {
    if (activeCase) {
      setNotes(activeCase.notes);
      
      // Set active note to the most recent one if available
      if (activeCase.notes.length > 0 && !activeNoteId) {
        const mostRecentNote = [...activeCase.notes].sort((a, b) => b.timestamp - a.timestamp)[0];
        setActiveNoteId(mostRecentNote.id);
        setNoteContent(mostRecentNote.content);
      } else if (activeCase.notes.length === 0) {
        setActiveNoteId(null);
        setNoteContent('');
      }
    } else {
      setNotes([]);
      setActiveNoteId(null);
      setNoteContent('');
    }
  }, [activeCase]);

  // Create ByBit case overview note if it doesn't exist
  useEffect(() => {
    if (activeCase && activeCase.name === "ByBit Hacker" && activeCase.notes.length === 0) {
      createBybitCaseNote();
    }
  }, [activeCase]);
  
  const createBybitCaseNote = () => {
    const bybitCaseOverview = `# ByBit Hack Investigation

## Analysis of the Smart Contract and Backdoor Mechanism

This case involves the analysis of a smart contract and a backdoor mechanism used to drain funds from ByBit wallets. 
The backdoor code was found in the file \`app-52c9031bfa03da47.js\` on the Safe Global application.

### Backdoor Mechanism

The backdoor code defines a "whitelist" (wa) and "blacklist" (ba) of addresses. If a transaction matched an address in the whitelist, 
it redirected the transfer to smart contract "ta" (0x96221423681a6d52e184d440a8efcebb105c7242) using data stored in "da", 
sending funds to smart contract 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516.

This JS backdoor essentially allowed the attacker (likely DPRK-affiliated) to drain the ByBit wallet when the caller was 
0x0fa09C3A328792253f8dee7116848723b72a6d2e, effectively targeting only wallets from the "whitelist" while all other transactions were ignored.
The attacker specifically targeted ByBit.

### Key Components of the Backdoor:

- **Whitelist (wa):** List of target addresses to be drained
- **Blacklist (ba):** List of addresses to be ignored
- **Transfer Address (ta):** 0x96221423681a6d52e184d440a8efcebb105c7242
- **Destination Address (da payload):** Encoded function call to transfer funds to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516
- **Attacker Address:** 0x0fa09C3A328792253f8dee7116848723b72a6d2e

### Decoding the da Payload

The da payload is an encoded function call. Here's how it breaks down:

**Function Selector:**
- The first 4 bytes (0xa9059cbb) represent the function selector for the transfer function in the ERC-20 token standard.
- The transfer function has the following signature: transfer(address _to, uint256 _value).

**Parameters:**
- The next 32 bytes represent the _to address:
  \`\`\`
  000000000000000000000000bdd077f651ebe7f7b3ce16fe5f2b025be2969516
  \`\`\`
  This decodes to the address 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516.

- The following 32 bytes represent the _value (amount to transfer):
  \`\`\`
  0000000000000000000000000000000000000000000000000000000000000000
  \`\`\`
  This decodes to the value 0.

### Attack Flow

1. User initiates a transaction on Safe Global app
2. If the user's address is in the whitelist, the backdoor activates
3. Transaction is redirected to contract 0x96221423681a6d52e184d440a8efcebb105c7242
4. Funds are transferred to 0xbdd077f651ebe7f7b3ce16fe5f2b025be2969516
5. The attacker (0x0fa09C3A328792253f8dee7116848723b72a6d2e) can then drain the funds

### FBI Alert Information

The FBI and Internet Crime Complaint Center (IC3) have issued alert I-022625-PSA (February 26, 2025) identifying North Korea as responsible for the $1.5 Billion Bybit Hack. The addresses listed in this case have been identified by the FBI as being associated with this attack.

For more information, see:
- FBI PSA: https://www.ic3.gov/PSA/2025/PSA250226
- Backdoor code: https://web.archive.org/web/20250219172905js_/https://app.safe.global/_next/static/chunks/pages/_app-52c9031bfa03da47.js

### Conclusion

This sophisticated attack specifically targeted ByBit by injecting malicious code into the Safe Global application. 
The backdoor was designed to only activate for specific addresses, making it harder to detect while allowing the 
attacker to drain funds from the targeted wallets.`;

    addNote(bybitCaseOverview);
  };
  
  const handleCreateNote = () => {
    if (!activeCase) return;
    
    const newNote = addNote('');
    if (newNote) {
      setActiveNoteId(newNote.id);
      setNoteContent('');
    }
  };
  
  const handleSaveNote = () => {
    if (!activeCase || !activeNoteId) return;
    
    updateNote(activeNoteId, noteContent);
  };
  
  const handleDeleteNote = (noteId: string) => {
    if (!activeCase) return;
    
    deleteNote(noteId);
    
    if (activeNoteId === noteId) {
      // If there are other notes, set the first one as active
      if (notes.length > 1) {
        const remainingNotes = notes.filter(n => n.id !== noteId);
        setActiveNoteId(remainingNotes[0].id);
        setNoteContent(remainingNotes[0].content);
      } else {
        setActiveNoteId(null);
        setNoteContent('');
      }
    }
  };
  
  const handleNoteSelect = (noteId: string) => {
    const selectedNote = notes.find(n => n.id === noteId);
    if (selectedNote) {
      setActiveNoteId(noteId);
      setNoteContent(selectedNote.content);
    }
  };
  
  const exportNotes = () => {
    if (!activeCase || notes.length === 0) return;
    
    const notesText = notes.map(note => {
      const date = new Date(note.timestamp).toLocaleString();
      return `--- Note from ${date} ---\n\n${note.content}\n\n`;
    }).join('\n');
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `chainhound-notes-${activeCase.name.replace(/\s+/g, '-')}-${timestamp}.txt`;
    
    // Create and download file
    const blob = new Blob([notesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const copyToClipboard = () => {
    if (!noteContent) return;
    
    navigator.clipboard.writeText(noteContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Function to render markdown-like content with basic formatting
  const renderFormattedContent = (content: string) => {
    // This is a very simple implementation - in a real app, you'd use a proper markdown renderer
    const lines = content.split('\n');
    return lines.map((line, index) => {
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-xl font-bold mb-2">{line.substring(2)}</h1>;
      } else if (line.startsWith('## ')) {
        return <h2 key={index} className="text-lg font-bold mb-2">{line.substring(3)}</h2>;
      } else if (line.startsWith('### ')) {
        return <h3 key={index} className="text-md font-bold mb-2">{line.substring(4)}</h3>;
      } else if (line.startsWith('- ')) {
        return <li key={index} className="ml-4 list-disc">{line.substring(2)}</li>;
      } else if (line.startsWith('1. ')) {
        return <li key={index} className="ml-4 list-decimal">{line.substring(3)}</li>;
      } else if (line.startsWith('```')) {
        return <pre key={index} className="bg-gray-900 p-2 rounded my-2 font-mono text-xs">{line.substring(3)}</pre>;
      } else if (line.includes('http')) {
        // Simple URL detection and linking
        const parts = line.split(/(https?:\/\/[^\s]+)/g);
        return (
          <p key={index} className="mb-2">
            {parts.map((part, i) => 
              part.match(/^https?:\/\//) ? 
                <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline flex items-center gap-1 inline-flex">
                  {part} <ExternalLink className="h-3 w-3" />
                </a> : 
                part
            )}
          </p>
        );
      } else if (line.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="mb-2">{line}</p>;
      }
    });
  };
  
  return (
    <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Investigation Notes
          </h2>
          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              onClick={handleCreateNote}
              disabled={!activeCase}
            >
              <Plus className="h-4 w-4" />
              <span>New Note</span>
            </button>
            {notes.length > 0 && (
              <button 
                className="flex items-center gap-1 px-3 py-1 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition-colors"
                onClick={exportNotes}
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {activeCase ? `Notes for case: ${activeCase.name}` : 'No active case selected'}
        </p>
      </div>
      
      {!activeCase ? (
        <div className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No active case selected</p>
          <p className="text-sm text-gray-500 mt-2">
            Select or create a case to start taking notes
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 h-[500px]">
          <div className="md:col-span-1 border-r border-gray-700 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-400">No notes yet</p>
                <button
                  className="mt-2 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  onClick={handleCreateNote}
                >
                  Create First Note
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {notes.map(note => (
                  <div 
                    key={note.id} 
                    className={`p-3 cursor-pointer ${activeNoteId === note.id ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                    onClick={() => handleNoteSelect(note.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-300 line-clamp-2">
                          {note.content.split('\n')[0] || 'Empty note'}
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(note.timestamp)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNote(note.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-400 rounded"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex flex-col h-full">
            <div className="p-3 border-b border-gray-700 bg-gray-900 flex justify-between items-center">
              <div className="text-sm text-gray-400">
                {activeNoteId ? 'Edit Note' : 'No note selected'}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyToClipboard}
                  disabled={!noteContent}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!activeNoteId}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </button>
              </div>
            </div>
            
            {activeNoteId ? (
              <div className="flex-1 flex">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Type your investigation notes here..."
                  className="flex-1 w-1/2 bg-gray-800 text-gray-200 p-4 border-none outline-none resize-none font-mono"
                />
                <div className="flex-1 w-1/2 bg-gray-900 text-gray-200 p-4 overflow-y-auto">
                  {renderFormattedContent(noteContent)}
                </div>
              </div>
            ) : (
              <div className="flex-1 w-full bg-gray-800 text-gray-400 p-4 flex items-center justify-center">
                <p>Select or create a note to start writing</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteScratchpad;