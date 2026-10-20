"use client"

import type { Faq } from "@/domain/types/common"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { cn } from "@/lib/utils"

/** FAQ accordion with editorial spacing; one item open at a time. */
export function FaqList({ faqs, className }: { faqs: Faq[]; className?: string }) {
  return (
    <Accordion type="single" collapsible className={cn("border-t border-border", className)}>
      {faqs.map((faq) => (
        <AccordionItem key={faq.question} value={faq.question} className="border-b border-border">
          <AccordionTrigger className="gap-6 rounded-none py-5 text-base font-semibold text-ocean-900 hover:no-underline md:text-[1.0625rem]">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="max-w-prose pb-6 text-[0.9375rem] leading-relaxed text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
