import { useState, useEffect } from "react";
import { X, Plus, Trash2, Upload, Image as ImageIcon, CheckSquare, Square, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Textarea } from "../../../../components/ui/textarea";
import { Label } from "../../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs";
import { Checkbox } from "../../../../components/ui/checkbox";
import { uploadToCloudinary } from "../../../../utils/cloudinary";

export default function QuizEditor({ module, setModule }) {
    const [quizQuestions, setQuizQuestions] = useState(module.quizData || []);
    const [currentQuestion, setCurrentQuestion] = useState({
        type: "single", // "single", "multi", or "paragraph"
        question: "",
        questionImage: "",
        options: ["", "", "", ""],
        correctOption: 0, // For single choice
        correctOptions: [], // For multi-choice
        answer: "", // For paragraph type
        points: 1,
        explanation: "" // For providing feedback
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState("single");

    // Sync quizQuestions with module.quizData
    useEffect(() => {
        setQuizQuestions(module.quizData || []);
    }, [module.quizData]);

    // Update module when quizQuestions change
    useEffect(() => {
        setModule(prev => ({
            ...prev,
            quizData: quizQuestions
        }));
    }, [quizQuestions, setModule]);

    // Update currentQuestion type when tab changes
    useEffect(() => {
        setCurrentQuestion(prev => ({
            ...prev,
            type: activeTab,
            correctOption: 0,
            correctOptions: [],
            answer: ""
        }));
    }, [activeTab]);

    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        try {
            setUploadingImage(true);
            const imageUrl = await uploadToCloudinary(file);
            setCurrentQuestion({
                ...currentQuestion,
                questionImage: imageUrl
            });
        } catch (error) {
            alert("Failed to upload image. Please try again.");
            console.error("Upload error:", error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRemoveImage = () => {
        setCurrentQuestion({
            ...currentQuestion,
            questionImage: ""
        });
    };

    const handleAddQuestion = () => {
        if (!currentQuestion.question.trim()) {
            alert("Please enter a question");
            return;
        }

        // Validate based on question type
        if (currentQuestion.type === "single" || currentQuestion.type === "multi") {
            if (currentQuestion.options.some(opt => !opt.trim())) {
                alert("Please fill in all options");
                return;
            }

            if (currentQuestion.type === "single" && currentQuestion.correctOption === undefined) {
                alert("Please select a correct option");
                return;
            }

            if (currentQuestion.type === "multi" && currentQuestion.correctOptions.length === 0) {
                alert("Please select at least one correct option");
                return;
            }
        } else if (currentQuestion.type === "paragraph") {
            if (!currentQuestion.answer.trim()) {
                alert("Please provide an answer for the paragraph question");
                return;
            }
        }

        const newQuestions = [...quizQuestions, currentQuestion];
        setQuizQuestions(newQuestions);
        setCurrentQuestion({
            type: activeTab,
            question: "",
            questionImage: "",
            options: ["", "", "", ""],
            correctOption: 0,
            correctOptions: [],
            answer: "",
            points: 1,
            explanation: ""
        });
    };

    const handleRemoveQuestion = (index) => {
        const newQuestions = quizQuestions.filter((_, i) => i !== index);
        setQuizQuestions(newQuestions);
    };

    const handleUpdateQuestion = (index, field, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[index][field] = value;
        setQuizQuestions(newQuestions);
    };

    const handleUpdateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...quizQuestions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuizQuestions(newQuestions);
    };

    const handleToggleCorrectOption = (qIndex, oIndex) => {
        const newQuestions = [...quizQuestions];
        const question = newQuestions[qIndex];

        if (question.type === "single") {
            question.correctOption = oIndex;
        } else if (question.type === "multi") {
            const currentOptions = question.correctOptions || [];
            if (currentOptions.includes(oIndex)) {
                question.correctOptions = currentOptions.filter(opt => opt !== oIndex);
            } else {
                question.correctOptions = [...currentOptions, oIndex];
            }
        }

        setQuizQuestions(newQuestions);
    };

    const handleImageUploadForQuestion = async (index, event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Please upload an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be less than 5MB");
            return;
        }

        try {
            setUploadingImage(true);
            const imageUrl = await uploadToCloudinary(file);
            handleUpdateQuestion(index, "questionImage", imageUrl);
        } catch (error) {
            alert("Failed to upload image. Please try again.");
            console.error("Upload error:", error);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleCorrectOptionsChange = (optionIndex) => {
        if (currentQuestion.correctOptions.includes(optionIndex)) {
            setCurrentQuestion({
                ...currentQuestion,
                correctOptions: currentQuestion.correctOptions.filter(opt => opt !== optionIndex)
            });
        } else {
            setCurrentQuestion({
                ...currentQuestion,
                correctOptions: [...currentQuestion.correctOptions, optionIndex]
            });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                    <span>Quiz Editor</span>
                    <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                        {quizQuestions.length} questions
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Add Question Form */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Add Question</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Question Type</label>
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid grid-cols-3 mb-4">
                                    <TabsTrigger value="single" className="flex items-center gap-2">
                                        <CheckSquare className="h-4 w-4" />
                                        Single Choice
                                    </TabsTrigger>
                                    <TabsTrigger value="multi" className="flex items-center gap-2">
                                        <Square className="h-4 w-4" />
                                        Multi Choice
                                    </TabsTrigger>
                                    <TabsTrigger value="paragraph" className="flex items-center gap-2">
                                        <Type className="h-4 w-4" />
                                        Paragraph
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Question Text *</label>
                            <Textarea
                                placeholder="Enter your question here..."
                                value={currentQuestion.question}
                                onChange={(e) => setCurrentQuestion({
                                    ...currentQuestion,
                                    question: e.target.value
                                })}
                                rows={3}
                            />
                        </div>

                        {/* Question Image Upload */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Question Image (Optional)</label>
                            <div className="border-2 border-dashed rounded-lg p-4">
                                {currentQuestion.questionImage ? (
                                    <div className="relative group">
                                        <img
                                            src={currentQuestion.questionImage}
                                            alt="Question"
                                            className="w-full h-48 object-contain rounded-lg"
                                        />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={handleRemoveImage}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            id="question-image-upload"
                                            disabled={uploadingImage}
                                        />
                                        <label htmlFor="question-image-upload">
                                            <div className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                                {uploadingImage ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                                                        <p className="text-sm text-muted-foreground">Uploading...</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-10 w-10 text-muted-foreground" />
                                                        <p className="text-sm font-medium">Click to upload an image</p>
                                                        <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                                                    </>
                                                )}
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Render options based on question type */}
                        {currentQuestion.type === "single" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Options *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {currentQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={currentQuestion.correctOption === idx}
                                                    onChange={() => setCurrentQuestion({
                                                        ...currentQuestion,
                                                        correctOption: idx
                                                    })}
                                                    className="h-4 w-4"
                                                />
                                                <span className="text-sm font-medium">
                                                    Option {String.fromCharCode(65 + idx)}
                                                </span>
                                            </div>
                                            <Input
                                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...currentQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setCurrentQuestion({
                                                        ...currentQuestion,
                                                        options: newOptions
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentQuestion.type === "multi" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Options * (Select multiple correct answers)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {currentQuestion.options.map((opt, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={currentQuestion.correctOptions.includes(idx)}
                                                    onCheckedChange={() => handleCorrectOptionsChange(idx)}
                                                    id={`option-${idx}`}
                                                />
                                                <Label htmlFor={`option-${idx}`} className="text-sm font-medium">
                                                    Option {String.fromCharCode(65 + idx)}
                                                </Label>
                                            </div>
                                            <Input
                                                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...currentQuestion.options];
                                                    newOptions[idx] = e.target.value;
                                                    setCurrentQuestion({
                                                        ...currentQuestion,
                                                        options: newOptions
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {currentQuestion.correctOptions.length} option(s) selected as correct
                                </p>
                            </div>
                        )}

                        {currentQuestion.type === "paragraph" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Expected Answer *</label>
                                <Textarea
                                    placeholder="Enter the expected answer or model answer..."
                                    value={currentQuestion.answer}
                                    onChange={(e) => setCurrentQuestion({
                                        ...currentQuestion,
                                        answer: e.target.value
                                    })}
                                    rows={4}
                                />
                                <p className="text-xs text-muted-foreground">
                                    This will be used for manual grading or auto-checking
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Points</label>
                            <Input
                                type="number"
                                min="1"
                                max="10"
                                value={currentQuestion.points}
                                onChange={(e) => setCurrentQuestion({
                                    ...currentQuestion,
                                    points: parseInt(e.target.value) || 1
                                })}
                                className="w-24"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Explanation (Optional)</label>
                            <Textarea
                                placeholder="Add explanation or feedback for this question..."
                                value={currentQuestion.explanation}
                                onChange={(e) => setCurrentQuestion({
                                    ...currentQuestion,
                                    explanation: e.target.value
                                })}
                                rows={2}
                            />
                            <p className="text-xs text-muted-foreground">
                                This will be shown to students after they answer
                            </p>
                        </div>

                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button
                                type="button"
                                onClick={handleAddQuestion}
                                className="w-full"
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Question
                                    </>
                                )}
                            </Button>
                        </motion.div>
                    </CardContent>
                </Card>

                {/* Questions List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Questions</h3>
                        {quizQuestions.length > 0 && (
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-muted-foreground">
                                    Total Points: {quizQuestions.reduce((sum, q) => sum + q.points, 0)}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {quizQuestions.length} question{quizQuestions.length !== 1 ? 's' : ''}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-600 rounded-full">
                                        Single: {quizQuestions.filter(q => q.type === 'single').length}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full">
                                        Multi: {quizQuestions.filter(q => q.type === 'multi').length}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-600 rounded-full">
                                        Paragraph: {quizQuestions.filter(q => q.type === 'paragraph').length}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <AnimatePresence>
                        {quizQuestions.length === 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-8 border-2 border-dashed rounded-lg"
                            >
                                <p className="text-muted-foreground">No questions added yet</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Add questions using the form above
                                </p>
                            </motion.div>
                        ) : (
                            <div className="space-y-4">
                                {quizQuestions.map((q, idx) => (
                                    <QuestionItem
                                        key={idx}
                                        question={q}
                                        index={idx}
                                        onUpdateQuestion={handleUpdateQuestion}
                                        onUpdateOption={handleUpdateOption}
                                        onToggleCorrectOption={handleToggleCorrectOption}
                                        onRemove={() => handleRemoveQuestion(idx)}
                                        onImageUpload={handleImageUploadForQuestion}
                                        uploadingImage={uploadingImage}
                                    />
                                ))}
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </CardContent>
        </Card>
    );
}

function QuestionItem({ question, index, onUpdateQuestion, onUpdateOption, onToggleCorrectOption, onRemove, onImageUpload, uploadingImage }) {
    const [editing, setEditing] = useState(false);
    const [editQuestion, setEditQuestion] = useState(question);

    const handleSave = () => {
        onUpdateQuestion(index, "type", editQuestion.type);
        onUpdateQuestion(index, "question", editQuestion.question);
        onUpdateQuestion(index, "questionImage", editQuestion.questionImage);

        if (editQuestion.type === "single") {
            onUpdateQuestion(index, "correctOption", editQuestion.correctOption);
        } else if (editQuestion.type === "multi") {
            onUpdateQuestion(index, "correctOptions", editQuestion.correctOptions);
        } else if (editQuestion.type === "paragraph") {
            onUpdateQuestion(index, "answer", editQuestion.answer);
        }

        onUpdateQuestion(index, "points", editQuestion.points);
        onUpdateQuestion(index, "explanation", editQuestion.explanation);

        if (editQuestion.type !== "paragraph") {
            editQuestion.options.forEach((opt, optIdx) => {
                onUpdateOption(index, optIdx, opt);
            });
        }

        setEditing(false);
    };

    const handleRemoveImage = () => {
        setEditQuestion({
            ...editQuestion,
            questionImage: ""
        });
    };

    const getQuestionTypeIcon = (type) => {
        switch (type) {
            case "single": return <CheckSquare className="h-4 w-4" />;
            case "multi": return <Square className="h-4 w-4" />;
            case "paragraph": return <Type className="h-4 w-4" />;
            default: return null;
        }
    };

    const getQuestionTypeColor = (type) => {
        switch (type) {
            case "single": return "bg-blue-100 text-blue-600";
            case "multi": return "bg-green-100 text-green-600";
            case "paragraph": return "bg-purple-100 text-purple-600";
            default: return "bg-gray-100 text-gray-600";
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="border rounded-lg p-4 bg-card"
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="font-bold text-primary">Q{index + 1}</span>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${getQuestionTypeColor(question.type)}`}>
                            {getQuestionTypeIcon(question.type)}
                            {question.type === "single" ? "Single Choice" :
                                question.type === "multi" ? "Multi Choice" : "Paragraph"}
                        </span>
                        <span className="text-sm px-2 py-1 bg-primary/10 text-primary rounded-full">
                            {question.points} point{question.points !== 1 ? 's' : ''}
                        </span>
                        {question.questionImage && (
                            <span className="text-sm px-2 py-1 bg-blue-100 text-blue-600 rounded-full flex items-center gap-1">
                                <ImageIcon className="h-3 w-3" />
                                Has Image
                            </span>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Question Type</label>
                                <Select
                                    value={editQuestion.type}
                                    onValueChange={(value) => setEditQuestion({
                                        ...editQuestion,
                                        type: value,
                                        ...(value === "paragraph" && { options: ["", "", "", ""], correctOption: 0, correctOptions: [] }),
                                        ...(value !== "paragraph" && { answer: "" })
                                    })}
                                >
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single">Single Choice</SelectItem>
                                        <SelectItem value="multi">Multi Choice</SelectItem>
                                        <SelectItem value="paragraph">Paragraph</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Textarea
                                value={editQuestion.question}
                                onChange={(e) => setEditQuestion({
                                    ...editQuestion,
                                    question: e.target.value
                                })}
                                className="font-medium"
                                rows={2}
                            />

                            {/* Edit Question Image */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Question Image</label>
                                <div className="border-2 border-dashed rounded-lg p-4">
                                    {editQuestion.questionImage ? (
                                        <div className="relative group">
                                            <img
                                                src={editQuestion.questionImage}
                                                alt="Question"
                                                className="w-full h-48 object-contain rounded-lg"
                                            />
                                            <Button
                                                type="button"
                                                variant="destructive"
                                                size="sm"
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={handleRemoveImage}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        onImageUpload(index, e);
                                                    }
                                                }}
                                                className="hidden"
                                                id={`edit-question-image-${index}`}
                                                disabled={uploadingImage}
                                            />
                                            <label htmlFor={`edit-question-image-${index}`}>
                                                <div className="cursor-pointer flex flex-col items-center justify-center space-y-2">
                                                    {uploadingImage ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                                            <p className="text-sm text-muted-foreground">Uploading...</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="h-8 w-8 text-muted-foreground" />
                                                            <p className="text-sm font-medium">Upload Image</p>
                                                        </>
                                                    )}
                                                </div>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {editQuestion.type === "single" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {editQuestion.options.map((opt, optIdx) => (
                                        <div key={optIdx} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="radio"
                                                    name={`edit-correct-${index}`}
                                                    checked={editQuestion.correctOption === optIdx}
                                                    onChange={() => setEditQuestion({
                                                        ...editQuestion,
                                                        correctOption: optIdx
                                                    })}
                                                    className="h-4 w-4"
                                                />
                                                <span className="text-sm font-medium">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </span>
                                            </div>
                                            <Input
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...editQuestion.options];
                                                    newOptions[optIdx] = e.target.value;
                                                    setEditQuestion({
                                                        ...editQuestion,
                                                        options: newOptions
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {editQuestion.type === "multi" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {editQuestion.options.map((opt, optIdx) => (
                                        <div key={optIdx} className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={editQuestion.correctOptions?.includes(optIdx) || false}
                                                    onCheckedChange={() => {
                                                        const currentOptions = editQuestion.correctOptions || [];
                                                        if (currentOptions.includes(optIdx)) {
                                                            setEditQuestion({
                                                                ...editQuestion,
                                                                correctOptions: currentOptions.filter(opt => opt !== optIdx)
                                                            });
                                                        } else {
                                                            setEditQuestion({
                                                                ...editQuestion,
                                                                correctOptions: [...currentOptions, optIdx]
                                                            });
                                                        }
                                                    }}
                                                    id={`edit-option-${index}-${optIdx}`}
                                                />
                                                <Label htmlFor={`edit-option-${index}-${optIdx}`} className="text-sm font-medium">
                                                    {String.fromCharCode(65 + optIdx)}
                                                </Label>
                                            </div>
                                            <Input
                                                value={opt}
                                                onChange={(e) => {
                                                    const newOptions = [...editQuestion.options];
                                                    newOptions[optIdx] = e.target.value;
                                                    setEditQuestion({
                                                        ...editQuestion,
                                                        options: newOptions
                                                    });
                                                }}
                                            />
                                        </div>
                                    ))}
                                    <p className="text-xs text-muted-foreground col-span-2">
                                        {editQuestion.correctOptions?.length || 0} option(s) selected as correct
                                    </p>
                                </div>
                            )}

                            {editQuestion.type === "paragraph" && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Expected Answer</label>
                                    <Textarea
                                        value={editQuestion.answer || ""}
                                        onChange={(e) => setEditQuestion({
                                            ...editQuestion,
                                            answer: e.target.value
                                        })}
                                        rows={3}
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Points</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={editQuestion.points}
                                    onChange={(e) => setEditQuestion({
                                        ...editQuestion,
                                        points: parseInt(e.target.value) || 1
                                    })}
                                    className="w-20"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Explanation (Optional)</label>
                                <Textarea
                                    value={editQuestion.explanation || ""}
                                    onChange={(e) => setEditQuestion({
                                        ...editQuestion,
                                        explanation: e.target.value
                                    })}
                                    rows={2}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex flex-col gap-3 mb-3">
                                <p className="font-medium">{question.question}</p>
                                {question.questionImage && (
                                    <div className="relative max-w-md">
                                        <img
                                            src={question.questionImage}
                                            alt="Question"
                                            className="rounded-lg border shadow-sm max-h-64 object-contain"
                                        />
                                    </div>
                                )}
                            </div>

                            {question.type === "single" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {question.options.map((opt, optIdx) => (
                                        <div
                                            key={optIdx}
                                            className={`p-2 rounded border ${question.correctOption === optIdx
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-muted/30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {String.fromCharCode(65 + optIdx)}.
                                                </span>
                                                <span>{opt}</span>
                                                {question.correctOption === optIdx && (
                                                    <span className="text-xs text-green-600 font-medium ml-auto">
                                                        ✓ Correct
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {question.type === "multi" && (
                                <div className="grid grid-cols-2 gap-2">
                                    {question.options.map((opt, optIdx) => (
                                        <div
                                            key={optIdx}
                                            className={`p-2 rounded border ${(question.correctOptions || []).includes(optIdx)
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-muted/30'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {String.fromCharCode(65 + optIdx)}.
                                                </span>
                                                <span>{opt}</span>
                                                {(question.correctOptions || []).includes(optIdx) && (
                                                    <span className="text-xs text-green-600 font-medium ml-auto">
                                                        ✓ Correct
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    <div className="col-span-2 text-sm text-muted-foreground">
                                        {(question.correctOptions || []).length} correct option(s)
                                    </div>
                                </div>
                            )}

                            {question.type === "paragraph" && (
                                <div className="space-y-2">
                                    <div className="p-3 bg-muted/30 rounded border">
                                        <p className="text-sm font-medium mb-1">Expected Answer:</p>
                                        <p className="text-sm whitespace-pre-wrap">{question.answer}</p>
                                    </div>
                                </div>
                            )}

                            {question.explanation && (
                                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-100">
                                    <p className="text-sm font-medium text-blue-700 mb-1">Explanation:</p>
                                    <p className="text-sm text-blue-600 whitespace-pre-wrap">{question.explanation}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 ml-4">
                    {editing ? (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleSave}
                                disabled={uploadingImage}
                            >
                                {uploadingImage ? (
                                    <>
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                                        Saving...
                                    </>
                                ) : 'Save'}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    setEditQuestion(question);
                                    setEditing(false);
                                }}
                                disabled={uploadingImage}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditing(true)}
                            >
                                Edit
                            </Button>
                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-destructive hover:text-destructive/90"
                                    onClick={onRemove}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>
        </motion.div>
    );
}