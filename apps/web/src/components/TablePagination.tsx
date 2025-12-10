
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function TablePagination({ currentPage, totalPages, onPageChange }: TablePaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <Pagination className="justify-end">
            <PaginationContent>
                <PaginationItem>
                    <PaginationPrevious
                        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Simple logic: show all pages for now, or implement ellipsis logic if needed.
                    // For typical dashboard usage < 10 pages, showing all is fine.
                    // If > 10, should implement windowing.
                    if (totalPages > 7 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                        if (page === currentPage - 3 || page === currentPage + 3) {
                            return <PaginationItem key={page}><PaginationEllipsis /></PaginationItem>;
                        }
                        return null;
                    }

                    return (
                        <PaginationItem key={page}>
                            <PaginationLink
                                isActive={page === currentPage}
                                onClick={() => onPageChange(page)}
                                className="cursor-pointer"
                            >
                                {page}
                            </PaginationLink>
                        </PaginationItem>
                    )
                })}

                <PaginationItem>
                    <PaginationNext
                        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                </PaginationItem>
            </PaginationContent>
        </Pagination>
    )
}
