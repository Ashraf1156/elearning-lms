import { useState, useEffect } from "react";
import { db } from "../../lib/firebase";
import { collection, getDocs, query, where, getDoc, doc, orderBy } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
    Search,
    BookOpen,
    Users,
    Loader2,
    Eye,
    Tag,
    ChevronRight,
    X,
    User,
    FileText,
    Key,
    Shield,
    Users as UsersIcon,
    Smartphone,
    Calendar,
    Clock,
    Video,
    File,
    Link,
    AlertCircle,
    CheckCircle,
    Layers,
    FileCode,
    FileImage,
    AudioLines,
    Puzzle,
    CheckSquare,
    MessageSquare,
    Code,
    Image,
    Music,
    ExternalLink
} from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../components/ui/collapsible";

export default function GuestCourses() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredCourses, setFilteredCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [activeTab, setActiveTab] = useState("all");
    const [courseDetails, setCourseDetails] = useState({});
    const [expandedSubSections, setExpandedSubSections] = useState({});

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        let filtered = courses;

        // Apply search filter
        if (searchQuery.trim() !== "") {
            filtered = filtered.filter(course =>
                course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                course.accessCode?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply tab filter
        if (activeTab === "with-device-restrictions") {
            filtered = filtered.filter(course => course.deviceRestrictions);
        } else if (activeTab === "guest-access") {
            filtered = filtered.filter(course => course.guestAccessEnabled);
        }

        setFilteredCourses(filtered);
    }, [searchQuery, courses, activeTab]);

    const fetchCourses = async () => {
        try {
            const coursesQuery = query(collection(db, "courses"));
            const snapshot = await getDocs(coursesQuery);

            const coursesData = await Promise.all(
                snapshot.docs.map(async (docSnapshot) => {
                    const courseData = {
                        id: docSnapshot.id,
                        ...docSnapshot.data()
                    };

                    // Fetch sections for each course
                    const sections = await fetchCourseSections(docSnapshot.id);
                    courseData.sections = sections;
                    courseData.totalSections = sections.length;

                    // Calculate total subSections and modules
                    let totalSubSections = 0;
                    let totalModules = 0;

                    sections.forEach(section => {
                        totalSubSections += section.subSections?.length || 0;

                        // Count modules in section level
                        totalModules += section.modules?.length || 0;

                        // Count modules in sub-sections
                        section.subSections?.forEach(subSection => {
                            totalModules += subSection.modules?.length || 0;
                        });
                    });

                    courseData.totalSubSections = totalSubSections;
                    courseData.totalModules = totalModules;

                    // Fetch instructor info
                    if (courseData.instructorId) {
                        const instructor = await fetchUserInfo(courseData.instructorId);
                        courseData.instructor = instructor;
                    }

                    // Fetch co-instructors info
                    if (courseData.coInstructorIds && courseData.coInstructorIds.length > 0) {
                        const coInstructors = await Promise.all(
                            courseData.coInstructorIds.map(id => fetchUserInfo(id))
                        );
                        courseData.coInstructors = coInstructors.filter(Boolean);
                    }

                    // Fetch enrollment count
                    try {
                        const enrollmentsQuery = query(
                            collection(db, "enrollments"),
                            where("courseId", "==", docSnapshot.id)
                        );
                        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
                        courseData.enrollmentCount = enrollmentsSnapshot.size;
                    } catch (error) {
                        console.log(`Could not fetch enrollment count for course ${docSnapshot.id}`);
                        courseData.enrollmentCount = 0;
                    }

                    // Set default values
                    if (!courseData.description) courseData.description = "No description available";
                    if (!courseData.category) courseData.category = "General";
                    if (courseData.deviceRestrictions === undefined) courseData.deviceRestrictions = true;
                    if (!courseData.maxDevices) courseData.maxDevices = 2;
                    if (courseData.guestAccessEnabled === undefined) courseData.guestAccessEnabled = false;

                    return courseData;
                })
            );

            setCourses(coursesData);
            setFilteredCourses(coursesData);
        } catch (error) {
            console.error("Error fetching courses:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCourseSections = async (courseId) => {
        try {
            const sectionsQuery = query(
                collection(db, `courses/${courseId}/sections`),
                orderBy("order", "asc")
            );
            const sectionsSnapshot = await getDocs(sectionsQuery);
            const sections = await Promise.all(
                sectionsSnapshot.docs.map(async (sectionDoc) => {
                    const sectionData = {
                        id: sectionDoc.id,
                        ...sectionDoc.data()
                    };

                    // Initialize arrays if they don't exist
                    sectionData.modules = sectionData.modules || [];
                    sectionData.subSections = sectionData.subSections || [];

                    // If subSections is an array of objects, fetch their modules
                    if (Array.isArray(sectionData.subSections) && sectionData.subSections.length > 0) {
                        sectionData.subSections = await Promise.all(
                            sectionData.subSections.map(async (subSection) => {
                                const subSectionData = {
                                    ...subSection,
                                    modules: subSection.modules || []
                                };
                                return subSectionData;
                            })
                        );
                    }

                    return sectionData;
                })
            );
            return sections;
        } catch (error) {
            console.log(`No sections found for course ${courseId}`);
            return [];
        }
    };

    const fetchUserInfo = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                    id: userId,
                    name: userData.name || userData.displayName || userData.email?.split('@')[0] || "Unknown",
                    email: userData.email || "No email",
                    role: userData.role || "instructor",
                    photoURL: userData.photoURL || null
                };
            }
        } catch (error) {
            console.log(`Could not fetch user info for ${userId}`);
        }
        return null;
    };

    const fetchCourseDetails = async (courseId) => {
        // Check if we already have details for this course
        if (courseDetails[courseId]) {
            return courseDetails[courseId];
        }

        try {
            // Fetch sections with all content
            const sections = await fetchCourseSections(courseId);

            // Fetch course document
            const courseDoc = await getDoc(doc(db, "courses", courseId));
            const courseData = {
                id: courseId,
                ...courseDoc.data()
            };

            // Fetch instructor info
            if (courseData.instructorId) {
                courseData.instructor = await fetchUserInfo(courseData.instructorId);
            }

            // Fetch co-instructors
            if (courseData.coInstructorIds && courseData.coInstructorIds.length > 0) {
                const coInstructors = await Promise.all(
                    courseData.coInstructorIds.map(id => fetchUserInfo(id))
                );
                courseData.coInstructors = coInstructors.filter(Boolean);
            }

            // Add sections to course data
            courseData.sections = sections;

            // Calculate totals
            let totalSubSections = 0;
            let totalModules = 0;

            sections.forEach(section => {
                totalSubSections += section.subSections?.length || 0;
                totalModules += section.modules?.length || 0;

                section.subSections?.forEach(subSection => {
                    totalModules += subSection.modules?.length || 0;
                });
            });

            courseData.totalSubSections = totalSubSections;
            courseData.totalModules = totalModules;

            // Cache the details
            setCourseDetails(prev => ({
                ...prev,
                [courseId]: courseData
            }));

            return courseData;
        } catch (error) {
            console.error("Error fetching course details:", error);
            return null;
        }
    };

    const previewCourse = async (course) => {
        const detailedCourse = await fetchCourseDetails(course.id);
        if (detailedCourse) {
            setSelectedCourse(detailedCourse);
            // Initialize expanded state for all sub-sections
            const expandedState = {};
            detailedCourse.sections?.forEach(section => {
                section.subSections?.forEach(subSection => {
                    expandedState[`${section.id}-${subSection.id}`] = false;
                });
            });
            setExpandedSubSections(expandedState);
        } else {
            setSelectedCourse(course);
        }
    };

    const closePreview = () => {
        setSelectedCourse(null);
        setExpandedSubSections({});
    };

    const toggleSubSection = (sectionId, subSectionId) => {
        const key = `${sectionId}-${subSectionId}`;
        setExpandedSubSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getModuleIcon = (module) => {
        const type = module.type?.toLowerCase() || '';
        switch (type) {
            case 'video': return <Video className="h-4 w-4" />;
            case 'document': return <FileText className="h-4 w-4" />;
            case 'text': return <FileText className="h-4 w-4" />;
            case 'quiz': return <CheckSquare className="h-4 w-4" />;
            case 'assignment': return <File className="h-4 w-4" />;
            case 'discussion': return <MessageSquare className="h-4 w-4" />;
            case 'code': return <Code className="h-4 w-4" />;
            case 'image': return <Image className="h-4 w-4" />;
            case 'audio': return <Music className="h-4 w-4" />;
            case 'link': return <ExternalLink className="h-4 w-4" />;
            case 'file': return <File className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    const getContentTypeIcon = (contentType) => {
        const type = contentType?.toLowerCase() || '';
        switch (type) {
            case 'video': return <Video className="h-3 w-3" />;
            case 'document': case 'text': return <FileText className="h-3 w-3" />;
            case 'quiz': return <CheckSquare className="h-3 w-3" />;
            case 'assignment': return <File className="h-3 w-3" />;
            case 'link': return <ExternalLink className="h-3 w-3" />;
            case 'code': return <Code className="h-3 w-3" />;
            case 'image': return <Image className="h-3 w-3" />;
            case 'audio': return <Music className="h-3 w-3" />;
            default: return <File className="h-3 w-3" />;
        }
    };

    const getModuleTypeBadge = (type) => {
        const typeMap = {
            'video': { label: 'Video', color: 'bg-blue-100 text-blue-800' },
            'document': { label: 'Document', color: 'bg-green-100 text-green-800' },
            'text': { label: 'Text', color: 'bg-gray-100 text-gray-800' },
            'quiz': { label: 'Quiz', color: 'bg-purple-100 text-purple-800' },
            'assignment': { label: 'Assignment', color: 'bg-orange-100 text-orange-800' },
            'discussion': { label: 'Discussion', color: 'bg-pink-100 text-pink-800' },
            'code': { label: 'Code', color: 'bg-indigo-100 text-indigo-800' },
            'file': { label: 'File', color: 'bg-yellow-100 text-yellow-800' },
            'link': { label: 'Link', color: 'bg-teal-100 text-teal-800' },
            'image': { label: 'Image', color: 'bg-cyan-100 text-cyan-800' },
            'audio': { label: 'Audio', color: 'bg-red-100 text-red-800' }
        };

        const typeInfo = typeMap[type?.toLowerCase()] || { label: type || 'Content', color: 'bg-gray-100 text-gray-800' };
        return <Badge className={`text-xs ${typeInfo.color}`}>{typeInfo.label}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Course Preview</h1>
                <p className="text-muted-foreground mt-1">
                    Preview all available courses ({courses.length} course{courses.length !== 1 ? 's' : ''})
                </p>
            </div>

            {/* Search and Tabs */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses by title, description, or access code..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="all">All Courses</TabsTrigger>
                        <TabsTrigger value="with-device-restrictions">Device Restrictions</TabsTrigger>
                        <TabsTrigger value="guest-access">Guest Access</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium">No courses found</h3>
                        <p className="text-muted-foreground mt-1">
                            {searchQuery ? "No courses match your search" : "No courses available"}
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCourses.map((course) => (
                        <Card key={course.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                                        <CardDescription className="mt-1 line-clamp-2">
                                            {course.description}
                                        </CardDescription>
                                    </div>
                                    {course.thumbnailUrl && (
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-16 h-16 object-cover rounded-md ml-2"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                            }}
                                        />
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {/* Course Info */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-3 w-3 text-muted-foreground" />
                                                <span>{course.enrollmentCount || 0} enrolled</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Key className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-mono text-xs">{course.accessCode || "No code"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Tag className="h-3 w-3 text-muted-foreground" />
                                                <span>{course.category || "General"}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Layers className="h-3 w-3 text-muted-foreground" />
                                                <span>{course.totalSections || 0} sections</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Counts */}
                                    <div className="text-sm text-muted-foreground">
                                        <div className="flex items-center gap-4">
                                            {course.totalSubSections > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <ChevronRight className="h-3 w-3" />
                                                    <span>{course.totalSubSections} sub-sections</span>
                                                </div>
                                            )}
                                            {course.totalModules > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3" />
                                                    <span>{course.totalModules} modules</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Security Indicators */}
                                    <div className="flex gap-2">
                                        {course.deviceRestrictions && (
                                            <Badge variant="outline" className="text-xs">
                                                <Smartphone className="h-3 w-3 mr-1" />
                                                Device Restriction
                                            </Badge>
                                        )}
                                        {course.guestAccessEnabled && (
                                            <Badge variant="outline" className="text-xs">
                                                <UsersIcon className="h-3 w-3 mr-1" />
                                                Guest Access
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Preview Button */}
                                    <Button
                                        className="w-full"
                                        onClick={() => previewCourse(course)}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        Preview Course
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Course Preview Modal */}
            {selectedCourse && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-background rounded-lg shadow-lg w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="border-b px-6 py-4 flex items-start justify-between">
                            <div className="flex items-start gap-4 flex-1">
                                {selectedCourse.thumbnailUrl && (
                                    <img
                                        src={selectedCourse.thumbnailUrl}
                                        alt={selectedCourse.title}
                                        className="w-24 h-24 object-cover rounded-lg"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                )}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h2 className="text-2xl font-bold">{selectedCourse.title}</h2>
                                            <p className="text-muted-foreground mt-1">{selectedCourse.description}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge className="font-mono">{selectedCourse.accessCode}</Badge>
                                            <Badge variant="secondary">{selectedCourse.category || "General"}</Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-sm">
                                        <div className="flex items-center gap-1">
                                            <Users className="h-3 w-3" />
                                            <span>{selectedCourse.enrollmentCount || 0} enrolled</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Layers className="h-3 w-3" />
                                            <span>{selectedCourse.sections?.length || 0} sections</span>
                                        </div>
                                        {selectedCourse.totalSubSections > 0 && (
                                            <div className="flex items-center gap-1">
                                                <ChevronRight className="h-3 w-3" />
                                                <span>{selectedCourse.totalSubSections} sub-sections</span>
                                            </div>
                                        )}
                                        {selectedCourse.totalModules > 0 && (
                                            <div className="flex items-center gap-1">
                                                <BookOpen className="h-3 w-3" />
                                                <span>{selectedCourse.totalModules} modules</span>
                                            </div>
                                        )}
                                        {selectedCourse.createdAt && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                <span>{new Date(selectedCourse.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={closePreview} className="ml-2">
                                <X className="h-5 w-5" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                                {/* Main Content - Curriculum */}
                                <div className="lg:col-span-3 space-y-6">
                                    {/* Course Sections */}
                                    {selectedCourse.sections && selectedCourse.sections.length > 0 ? (
                                        <div className="space-y-6">
                                            {selectedCourse.sections.map((section, sectionIndex) => (
                                                <Card key={section.id}>
                                                    <CardHeader>
                                                        <CardTitle>
                                                            <div className="flex items-center gap-2">
                                                                <Layers className="h-5 w-5" />
                                                                <span>
                                                                    Section {section.order || sectionIndex + 1}: {section.title || "Untitled Section"}
                                                                </span>
                                                            </div>
                                                        </CardTitle>
                                                        {section.description && (
                                                            <CardDescription>{section.description}</CardDescription>
                                                        )}
                                                    </CardHeader>
                                                    <CardContent className="space-y-4">
                                                        {/* Section-Level Modules */}
                                                        {section.modules && section.modules.length > 0 && (
                                                            <div className="space-y-3">
                                                                <h4 className="text-sm font-medium text-muted-foreground">
                                                                    Section-Level Modules ({section.modules.length})
                                                                </h4>
                                                                <div className="space-y-2">
                                                                    {section.modules.map((module, moduleIndex) => (
                                                                        <div key={module.id || moduleIndex} className="p-3 border rounded-lg">
                                                                            <div className="flex items-start justify-between">
                                                                                <div className="flex-1">
                                                                                    <div className="flex items-center gap-2 mb-2">
                                                                                        {getModuleIcon(module)}
                                                                                        <span className="font-medium">{module.title || `Module ${moduleIndex + 1}`}</span>
                                                                                    </div>
                                                                                    {module.description && (
                                                                                        <p className="text-sm text-muted-foreground mb-2">
                                                                                            {module.description}
                                                                                        </p>
                                                                                    )}
                                                                                    {module.content && (
                                                                                        <div className="prose prose-sm max-w-none bg-muted/20 p-2 rounded text-sm">
                                                                                            <div dangerouslySetInnerHTML={{
                                                                                                __html: module.content.substring(0, 500) +
                                                                                                    (module.content.length > 500 ? "..." : "")
                                                                                            }} />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="ml-2 flex flex-col items-end gap-1">
                                                                                    {module.type && getModuleTypeBadge(module.type)}
                                                                                    {module.duration && (
                                                                                        <Badge variant="outline" className="text-xs">
                                                                                            <Clock className="h-2 w-2 mr-1" />
                                                                                            {module.duration}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Sub-Sections */}
                                                        {section.subSections && section.subSections.length > 0 && (
                                                            <div className="space-y-4">
                                                                <h4 className="text-sm font-medium text-muted-foreground">
                                                                    Sub-Sections ({section.subSections.length})
                                                                </h4>
                                                                <div className="space-y-3">
                                                                    {section.subSections.map((subSection, subIndex) => {
                                                                        const subSectionKey = `${section.id}-${subSection.id}`;
                                                                        const isExpanded = expandedSubSections[subSectionKey];
                                                                        const moduleCount = subSection.modules?.length || 0;

                                                                        return (
                                                                            <Collapsible
                                                                                key={subSection.id || subIndex}
                                                                                open={isExpanded}
                                                                                onOpenChange={() => toggleSubSection(section.id, subSection.id)}
                                                                            >
                                                                                <div className="border rounded-lg">
                                                                                    <CollapsibleTrigger className="w-full p-3 text-left hover:bg-muted/20">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <div className="flex items-center gap-2">
                                                                                                <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                                                                                <div>
                                                                                                    <h5 className="font-medium">
                                                                                                        {subSection.title || `Sub-Section ${subIndex + 1}`}
                                                                                                    </h5>
                                                                                                    {subSection.description && (
                                                                                                        <p className="text-sm text-muted-foreground">
                                                                                                            {subSection.description}
                                                                                                        </p>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-2">
                                                                                                {moduleCount > 0 && (
                                                                                                    <Badge variant="outline" className="text-xs">
                                                                                                        {moduleCount} module{moduleCount !== 1 ? 's' : ''}
                                                                                                    </Badge>
                                                                                                )}
                                                                                                {subSection.duration && (
                                                                                                    <Badge variant="secondary" className="text-xs">
                                                                                                        <Clock className="h-2 w-2 mr-1" />
                                                                                                        {subSection.duration}
                                                                                                    </Badge>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    </CollapsibleTrigger>


                                                                                    <CollapsibleContent>
                                                                                        <div className="p-4 pt-0 border-t">
                                                                                            {/* Sub-Section Content */}
                                                                                            {subSection.content && (
                                                                                                <div className="mb-4 p-3 bg-muted/30 rounded">
                                                                                                    <h6 className="text-sm font-medium mb-2">Content</h6>
                                                                                                    <div className="prose prose-sm max-w-none">
                                                                                                        <div dangerouslySetInnerHTML={{ __html: subSection.content }} />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}

                                                                                            {/* Sub-Section Modules */}
                                                                                            {subSection.modules && subSection.modules.length > 0 ? (
                                                                                                <div className="space-y-3">
                                                                                                    <h6 className="text-sm font-medium text-muted-foreground">
                                                                                                        Modules ({moduleCount})
                                                                                                    </h6>
                                                                                                    <div className="space-y-2">
                                                                                                        {subSection.modules.map((module, moduleIndex) => (
                                                                                                            <div key={module.id || moduleIndex} className="p-3 border rounded bg-card">
                                                                                                                <div className="flex items-start justify-between">
                                                                                                                    <div className="flex-1">
                                                                                                                        <div className="flex items-center gap-2 mb-2">
                                                                                                                            {getModuleIcon(module)}
                                                                                                                            <span className="font-medium text-sm">
                                                                                                                                {module.title || `Module ${moduleIndex + 1}`}
                                                                                                                            </span>
                                                                                                                        </div>
                                                                                                                        {module.description && (
                                                                                                                            <p className="text-xs text-muted-foreground mb-2">
                                                                                                                                {module.description}
                                                                                                                            </p>
                                                                                                                        )}
                                                                                                                        {module.content && (
                                                                                                                            <div className="prose prose-xs max-w-none bg-muted/20 p-2 rounded text-xs">
                                                                                                                                <div dangerouslySetInnerHTML={{
                                                                                                                                    __html: module.content.substring(0, 300) +
                                                                                                                                        (module.content.length > 300 ? "..." : "")
                                                                                                                                }} />
                                                                                                                            </div>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                    <div className="ml-2 flex flex-col items-end gap-1">
                                                                                                                        {module.type && getModuleTypeBadge(module.type)}
                                                                                                                        {module.duration && (
                                                                                                                            <Badge variant="outline" className="text-xs">
                                                                                                                                <Clock className="h-2 w-2 mr-1" />
                                                                                                                                {module.duration}
                                                                                                                            </Badge>
                                                                                                                        )}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : (
                                                                                                <div className="text-center py-6 text-muted-foreground">
                                                                                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                                                                                    <p className="text-sm">No modules in this sub-section</p>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </CollapsibleContent>
                                                                                </div>
                                                                            </Collapsible>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* No Content Message */}
                                                        {(!section.modules || section.modules.length === 0) &&
                                                            (!section.subSections || section.subSections.length === 0) && (
                                                                <div className="text-center py-8 text-muted-foreground">
                                                                    <FileText className="h-8 w-8 mx-auto mb-2" />
                                                                    <p className="text-sm">No content in this section</p>
                                                                </div>
                                                            )}
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    ) : (
                                        <Card>
                                            <CardContent className="py-12 text-center">
                                                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                                <p className="text-muted-foreground">No curriculum available for this course</p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Sidebar */}
                                <div className="space-y-6">
                                    {/* Course Info */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Course Information</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Access Code</div>
                                                <div className="flex items-center gap-2">
                                                    <Key className="h-4 w-4" />
                                                    <span className="font-mono font-medium">{selectedCourse.accessCode}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4" />
                                                    <span>
                                                        {selectedCourse.createdAt
                                                            ? new Date(selectedCourse.createdAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })
                                                            : "Unknown"
                                                        }
                                                    </span>
                                                </div>
                                            </div>

                                            {selectedCourse.updatedAt && (
                                                <div>
                                                    <div className="text-sm font-medium text-muted-foreground mb-1">Last Updated</div>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-4 w-4" />
                                                        <span>
                                                            {new Date(selectedCourse.updatedAt).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                    {/* Security Settings */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Shield className="h-5 w-5" />
                                                Security Settings
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Device Restrictions</span>
                                                {selectedCourse.deviceRestrictions ? (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="text-sm">Enabled</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span className="text-sm">Disabled</span>
                                                    </div>
                                                )}
                                            </div>

                                            {selectedCourse.deviceRestrictions && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Max Devices</span>
                                                    <span className="text-sm font-medium">{selectedCourse.maxDevices || 2}</span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between">
                                                <span className="text-sm">Guest Access</span>
                                                {selectedCourse.guestAccessEnabled ? (
                                                    <div className="flex items-center gap-1 text-green-600">
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="text-sm">Enabled</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <AlertCircle className="h-4 w-4" />
                                                        <span className="text-sm">Disabled</span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>

                                    {/* Instructor Team */}
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <UsersIcon className="h-5 w-5" />
                                                Instructor Team
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            {/* Main Instructor */}
                                            {selectedCourse.instructor && (
                                                <div>
                                                    <div className="text-sm font-medium text-muted-foreground mb-2">Main Instructor</div>
                                                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                                                        {selectedCourse.instructor.photoURL ? (
                                                            <img
                                                                src={selectedCourse.instructor.photoURL}
                                                                alt={selectedCourse.instructor.name}
                                                                className="h-10 w-10 rounded-full"
                                                            />
                                                        ) : (
                                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                                <User className="h-5 w-5 text-primary" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-medium">{selectedCourse.instructor.name}</div>
                                                            <div className="text-xs text-muted-foreground">{selectedCourse.instructor.role}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Co-Instructors */}
                                            {selectedCourse.coInstructors && selectedCourse.coInstructors.length > 0 && (
                                                <div>
                                                    <div className="text-sm font-medium text-muted-foreground mb-2">
                                                        Co-Instructors ({selectedCourse.coInstructors.length})
                                                    </div>
                                                    <div className="space-y-2">
                                                        {selectedCourse.coInstructors.map((coInstructor) => (
                                                            <div key={coInstructor.id} className="flex items-center gap-2 p-2 border rounded">
                                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                                                    <User className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="text-sm font-medium">{coInstructor.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{coInstructor.role}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t px-6 py-4 flex justify-end">
                            <Button onClick={closePreview}>Close Preview</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}