import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const progressVariants = cva(
    "relative overflow-hidden rounded-full bg-secondary",
    {
        variants: {
            size: {
                default: "h-2",
                sm: "h-1",
                lg: "h-3",
                xl: "h-4",
                "2xl": "h-6"
            },
            variant: {
                default: "bg-secondary",
                primary: "bg-primary/20",
                success: "bg-green-100",
                warning: "bg-amber-100",
                destructive: "bg-red-100",
                info: "bg-blue-100",
                subtle: "bg-gray-100"
            },
            animated: {
                true: "[&>div]:animate-pulse",
                false: ""
            }
        },
        defaultVariants: {
            size: "default",
            variant: "default",
            animated: false
        },
    }
)

const progressIndicatorVariants = cva(
    "h-full w-full flex-1 transition-all duration-300 ease-in-out",
    {
        variants: {
            color: {
                default: "bg-primary",
                primary: "bg-primary",
                success: "bg-green-600",
                warning: "bg-amber-500",
                destructive: "bg-red-600",
                info: "bg-blue-600",
                gradient: "bg-gradient-to-r from-primary to-primary/70",
                gradientSuccess: "bg-gradient-to-r from-green-500 to-green-700",
                gradientWarning: "bg-gradient-to-r from-amber-500 to-amber-700",
                gradientDestructive: "bg-gradient-to-r from-red-500 to-red-700"
            },
            striped: {
                true: "bg-striped",
                false: ""
            },
            animated: {
                true: "animate-pulse",
                false: ""
            }
        },
        defaultVariants: {
            color: "default",
            striped: false,
            animated: false
        },
    }
)

const Progress = React.forwardRef(({
    className,
    value = 0,
    max = 100,
    size = "default",
    variant = "default",
    color = "default",
    showValue = false,
    valuePosition = "right",
    label,
    labelPosition = "top",
    striped = false,
    animated = false,
    showIndicator = true,
    indicatorClassName,
    indicatorStyle,
    ...props
}, ref) => {
    // Clamp value between 0 and max
    const clampedValue = Math.max(0, Math.min(value, max))
    const percentage = max > 0 ? (clampedValue / max) * 100 : 0

    // Determine if we should show the indicator based on value
    const shouldShowIndicator = showIndicator && percentage > 0

    // Format value text
    const valueText = showValue ? (
        <span className="text-xs font-medium text-foreground">
            {Math.round(percentage)}%
        </span>
    ) : null

    // Render label if provided
    const renderLabel = label && (
        <div className={cn(
            "text-sm font-medium text-foreground mb-1",
            labelPosition === "bottom" && "mt-1 mb-0",
            labelPosition === "left" && "mr-2",
            labelPosition === "right" && "ml-2"
        )}>
            {label}
        </div>
    )

    // Render value based on position
    const renderValue = () => {
        if (!showValue) return null

        return (
            <div className={cn(
                "flex items-center justify-center",
                valuePosition === "inside" && "absolute inset-0 z-10",
                valuePosition === "right" && "ml-2",
                valuePosition === "left" && "mr-2",
                valuePosition === "top" && "mb-1",
                valuePosition === "bottom" && "mt-1"
            )}>
                {valueText}
            </div>
        )
    }

    return (
        <div className={cn(
            "w-full",
            labelPosition === "top" || labelPosition === "bottom" ? "flex flex-col" : "flex items-center",
            className
        )} ref={ref} {...props}>
            {/* Label at top or left */}
            {(labelPosition === "top" || labelPosition === "left") && renderLabel}

            <div className={cn(
                "flex-1",
                labelPosition === "top" || labelPosition === "bottom" ? "w-full" : "flex-1"
            )}>
                {/* Value at top or left */}
                {(valuePosition === "top" || valuePosition === "left") && renderValue()}

                {/* Progress Bar Container */}
                <div className={cn(
                    "relative w-full",
                    progressVariants({ size, variant, animated })
                )}>
                    {/* Progress Indicator */}
                    {shouldShowIndicator && (
                        <div
                            className={cn(
                                progressIndicatorVariants({ color, striped, animated }),
                                indicatorClassName
                            )}
                            style={{
                                width: `${percentage}%`,
                                transition: "width 0.6s ease",
                                ...indicatorStyle
                            }}
                            role="progressbar"
                            aria-valuenow={clampedValue}
                            aria-valuemin={0}
                            aria-valuemax={max}
                            aria-label={label || `Progress: ${Math.round(percentage)}%`}
                        >
                            {/* Value inside indicator */}
                            {valuePosition === "inside" && percentage >= 30 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary-foreground">
                                        {Math.round(percentage)}%
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Value at bottom or right */}
                {(valuePosition === "bottom" || valuePosition === "right") && renderValue()}
            </div>

            {/* Label at bottom or right */}
            {(labelPosition === "bottom" || labelPosition === "right") && renderLabel}
        </div>
    )
})

Progress.displayName = "Progress"

// Circular Progress Component
const CircularProgress = React.forwardRef(({
    className,
    value = 0,
    max = 100,
    size = 64,
    strokeWidth = 4,
    color = "primary",
    showValue = true,
    valueClassName,
    children,
    ...props
}, ref) => {
    const clampedValue = Math.max(0, Math.min(value, max))
    const percentage = max > 0 ? (clampedValue / max) * 100 : 0
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    const getColorClass = () => {
        switch (color) {
            case "success": return "stroke-green-600"
            case "warning": return "stroke-amber-500"
            case "destructive": return "stroke-red-600"
            case "info": return "stroke-blue-600"
            default: return "stroke-primary"
        }
    }

    const getTrackColorClass = () => {
        switch (color) {
            case "success": return "stroke-green-100"
            case "warning": return "stroke-amber-100"
            case "destructive": return "stroke-red-100"
            case "info": return "stroke-blue-100"
            default: return "stroke-secondary"
        }
    }

    return (
        <div
            className={cn("relative inline-flex items-center justify-center", className)}
            ref={ref}
            style={{ width: size, height: size }}
            {...props}
        >
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
                aria-hidden="true"
            >
                {/* Background track */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className={cn("fill-none", getTrackColorClass())}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    className={cn("fill-none transition-all duration-500 ease-in-out", getColorClass())}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {showValue ? (
                    <div className={cn("text-center", valueClassName)}>
                        <span className="text-lg font-bold text-foreground">
                            {Math.round(percentage)}%
                        </span>
                    </div>
                ) : children}
            </div>
        </div>
    )
})

CircularProgress.displayName = "CircularProgress"

// Progress Steps Component
const ProgressSteps = React.forwardRef(({
    className,
    steps,
    currentStep = 0,
    orientation = "horizontal",
    size = "default",
    ...props
}, ref) => {
    const totalSteps = steps.length
    const stepSize = orientation === "horizontal" ? "w-full" : "h-full"

    const getStepSize = () => {
        switch (size) {
            case "sm": return "h-8 w-8 text-xs"
            case "lg": return "h-12 w-12 text-base"
            default: return "h-10 w-10 text-sm"
        }
    }

    return (
        <div
            className={cn(
                "flex",
                orientation === "horizontal"
                    ? "flex-row items-center justify-between"
                    : "flex-col items-start justify-center h-full",
                className
            )}
            ref={ref}
            {...props}
        >
            {steps.map((step, index) => {
                const isCompleted = index < currentStep
                const isCurrent = index === currentStep
                const isUpcoming = index > currentStep

                return (
                    <React.Fragment key={index}>
                        {/* Step */}
                        <div className={cn(
                            "flex flex-col items-center",
                            orientation === "horizontal" ? "flex-1" : "mb-2"
                        )}>
                            <div className="flex items-center">
                                {/* Connector line before (except first step) */}
                                {index > 0 && (
                                    <div className={cn(
                                        "flex-1",
                                        orientation === "horizontal"
                                            ? "h-0.5 mx-2"
                                            : "w-0.5 my-2",
                                        isCompleted ? "bg-primary" : "bg-secondary"
                                    )} />
                                )}

                                {/* Step indicator */}
                                <div className={cn(
                                    "rounded-full flex items-center justify-center font-semibold border-2 transition-all duration-300",
                                    getStepSize(),
                                    isCompleted && "bg-primary text-primary-foreground border-primary",
                                    isCurrent && "bg-primary/10 text-primary border-primary",
                                    isUpcoming && "bg-background text-muted-foreground border-secondary"
                                )}>
                                    {isCompleted ? "✓" : index + 1}
                                </div>

                                {/* Connector line after (except last step) */}
                                {index < totalSteps - 1 && (
                                    <div className={cn(
                                        "flex-1",
                                        orientation === "horizontal"
                                            ? "h-0.5 mx-2"
                                            : "w-0.5 my-2",
                                        isCompleted ? "bg-primary" : "bg-secondary"
                                    )} />
                                )}
                            </div>

                            {/* Step label */}
                            <div className={cn(
                                "mt-2 text-center",
                                orientation === "horizontal" ? "w-full" : "whitespace-nowrap"
                            )}>
                                <div className={cn(
                                    "text-xs font-medium",
                                    isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {step.label}
                                </div>
                                {step.description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {step.description}
                                    </div>
                                )}
                            </div>
                        </div>
                    </React.Fragment>
                )
            })}
        </div>
    )
})

ProgressSteps.displayName = "ProgressSteps"

export { Progress, progressVariants, progressIndicatorVariants, CircularProgress, ProgressSteps }