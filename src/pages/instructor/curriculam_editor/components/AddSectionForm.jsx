import { useState } from "react";
import { Input } from "../../../../components/ui/input";
import { Plus, Clock, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../../../../components/ui/button";
import { addSection } from "../../../../services/sectionService";

export default function AddSectionForm({ courseId, sectionsLength, onSectionAdded }) {
    const [newSectionTitle, setNewSectionTitle] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const suggestions = [
        { title: "Introduction", icon: "🚀", description: "Course overview and objectives" },
        { title: "Getting Started", icon: "🎯", description: "Setup and prerequisites" },
        { title: "Core Concepts", icon: "📚", description: "Fundamental theories and principles" },
        { title: "Practical Exercises", icon: "💻", description: "Hands-on practice sessions" },
        { title: "Advanced Topics", icon: "⚡", description: "Complex concepts and techniques" },
        { title: "Case Studies", icon: "📊", description: "Real-world examples and analysis" },
        { title: "Final Project", icon: "🏆", description: "Capstone project work" },
        { title: "Assessment", icon: "📝", description: "Tests and quizzes" },
        { title: "Resources", icon: "📚", description: "Additional learning materials" },
        { title: "Conclusion", icon: "🎓", description: "Course summary and next steps" }
    ];

    const handleAddSection = async (e) => {
        e.preventDefault();
        setError("");

        if (!newSectionTitle.trim()) {
            setError("Section title is required");
            return;
        }

        if (newSectionTitle.trim().length < 3) {
            setError("Section title must be at least 3 characters");
            return;
        }

        setAdding(true);

        try {
            // ✅ FIX: Pass an object with title property instead of just the title string
            await addSection(courseId, {
                title: newSectionTitle.trim(),
                // You can add other properties here if needed
                description: "",
                duration: "60 min"
            });

            setNewSectionTitle("");
            setShowSuggestions(false);

            if (onSectionAdded) {
                onSectionAdded();
            }

            // Show success feedback
            setTimeout(() => {
                // You could add a toast notification here
                console.log("Section added successfully!");
            }, 100);
        } catch (error) {
            console.error("Error adding section:", error);
            setError(error.message || "Failed to add section. Please try again.");
        } finally {
            setAdding(false);
        }
    };

    const handleQuickSelect = (title) => {
        setNewSectionTitle(title);
        setError("");
        setShowSuggestions(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddSection(e);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-6 border-t"
        >
            <form onSubmit={handleAddSection} className="space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Add New Section</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                            Order: {sectionsLength + 1}
                        </span>
                    </div>

                    <div className="relative">
                        <Input
                            value={newSectionTitle}
                            onChange={(e) => {
                                setNewSectionTitle(e.target.value);
                                if (error) setError("");
                                if (e.target.value.length > 0) {
                                    setShowSuggestions(true);
                                }
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder="What's the next section about? (e.g., 'Introduction to React Hooks')"
                            className="pl-10 pr-4 py-6 text-base"
                            disabled={adding}
                            autoComplete="off"
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                            <Plus className="h-5 w-5 text-muted-foreground" />
                        </div>

                        <AnimatePresence>
                            {newSectionTitle && !adding && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                                >
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setNewSectionTitle("")}
                                        className="h-8 w-8 p-0"
                                    >
                                        ✕
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="p-3 bg-destructive/10 border border-destructive/20 rounded-md"
                        >
                            <p className="text-sm text-destructive">{error}</p>
                        </motion.div>
                    )}

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowSuggestions(!showSuggestions)}
                                className="gap-1"
                            >
                                <Sparkles className="h-3 w-3" />
                                Suggestions
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Suggestions Panel */}
                <AnimatePresence>
                    {showSuggestions && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2 mb-3">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    <h4 className="font-medium">Quick Suggestions</h4>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {suggestions.map((suggestion, index) => (
                                        <motion.div
                                            key={suggestion.title}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => handleQuickSelect(suggestion.title)}
                                                className="w-full h-auto py-3 justify-start text-left hover:bg-primary/5 hover:border-primary/30 transition-all"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <span className="text-xl">{suggestion.icon}</span>
                                                    <div className="flex-1">
                                                        <div className="font-medium">{suggestion.title}</div>
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {suggestion.description}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <motion.div
                        className="flex-1"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                    >
                        <Button
                            type="submit"
                            disabled={adding || !newSectionTitle.trim()}
                            className="w-full gap-2 py-6 text-base"
                        >
                            {adding ? (
                                <>
                                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Adding Section...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="h-5 w-5" />
                                    <span>Add Section</span>
                                    <span className="text-sm opacity-80 ml-auto">
                                        #{sectionsLength + 1}
                                    </span>
                                </>
                            )}
                        </Button>
                    </motion.div>

                    {sectionsLength > 0 && (
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    // Optional: Add multiple sections feature
                                    console.log("Open bulk add modal");
                                }}
                                className="gap-2 py-6"
                            >
                                <Clock className="h-4 w-4" />
                                <span className="hidden sm:inline">Bulk Add</span>
                            </Button>
                        </motion.div>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3">
                    <div className="text-center p-3 bg-primary/5 rounded-lg">
                        <div className="text-2xl font-bold text-primary">{sectionsLength}</div>
                        <div className="text-xs text-muted-foreground">Total Sections</div>
                    </div>
                    <div className="text-center p-3 bg-secondary/5 rounded-lg">
                        <div className="text-2xl font-bold text-secondary">
                            {sectionsLength === 0 ? "0" : "1"}-{sectionsLength + 1}
                        </div>
                        <div className="text-xs text-muted-foreground">Section Range</div>
                    </div>
                </div>
            </form>
        </motion.div>
    );
}