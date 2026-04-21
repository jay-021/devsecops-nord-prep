"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface VirtualKeyboardProps {
  currentChar?: string
  className?: string
}

const keyboardLayout = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
]

export function VirtualKeyboard({ currentChar, className }: VirtualKeyboardProps) {
  const normalizedCurrentChar = currentChar?.toUpperCase()

  return (
    <div className={cn("w-full max-w-2xl mx-auto p-4", className)}>
      <div className="space-y-2">
        {keyboardLayout.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1">
            {row.map((key) => {
              const isActive = normalizedCurrentChar === key
              return (
                <div
                  key={key}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-md border text-sm font-medium transition-all duration-200",
                    "bg-card border-border text-card-foreground",
                    "hover:bg-accent hover:text-accent-foreground",
                    isActive && "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                  )}
                >
                  {key}
                </div>
              )
            })}
          </div>
        ))}
        
        {/* Spacebar */}
        <div className="flex justify-center mt-2">
          <div
            className={cn(
              "w-64 h-10 flex items-center justify-center rounded-md border text-sm font-medium transition-all duration-200",
              "bg-card border-border text-card-foreground",
              "hover:bg-accent hover:text-accent-foreground",
              normalizedCurrentChar === ' ' && "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
            )}
          >
            SPACE
          </div>
        </div>
      </div>
    </div>
  )
}