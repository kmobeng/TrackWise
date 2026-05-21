import { Request, Response, NextFunction } from "express";
import {
  autoCategorizeExpenseSchema,
  createExpenseSchema,
  dailyExpenseSummarySchema,
  getExpensesQuerySchema,
  monthlyExpenseSummarySchema,
  updateExpenseSchema,
} from "../validators/expense.validator";
import { createError } from "../utils/error.util";
import { prisma } from "../lib/prisma";
import {
  createExpenseService,
  deleteExpenseService,
  categoryMonthlySummaryService,
  dailyExpenseSummaryService,
  getExpensesService,
  getSingleExpenseService,
  monthlyExpenseSummaryService,
  updateExpenseService,
  aiMonthlySummaryService,
  exportDataAsCSVService,
} from "../services/expense.service";
import { getDefaultCategoriesCached } from "../services/category.service";
import { toCedis, toPesewas } from "../utils/convertAmount.util";
import { extractExpenseDetails } from "../utils/autoCategorize.util";
import PDFDocument from "pdfkit";

export const createExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const parsed = createExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    let categoryId = parsed.data.categoryId;
    if (!categoryId) {
      const otherCategory = await prisma.category.findFirst({
        where: {
          name: "Other",
          isDefault: true,
        },
      });
      categoryId = otherCategory!.id;
    }

    const { amount, description, date } = parsed.data;

    const pesewas = toPesewas(amount);
    const dateObj = new Date(date);

    const expense = await createExpenseService(
      pesewas,
      description,
      dateObj,
      categoryId,
      req.user!.id,
    );

    expense.amount = toCedis(expense.amount);

    res.status(201).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const getExpenses = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = getExpensesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }
    const { page, limit, sortBy, sortOrder, startDate, endDate, desc } =
      parsed.data;

    const userId = req.user!.id;
    const expenses = await getExpensesService({
      userId,
      page,
      limit,
      sortBy,
      sortOrder,
      startDate,
      endDate,
      desc,
    });

    res.status(200).json({
      success: true,
      ...expenses,
    });
  } catch (error) {
    next(error);
  }
};

export const getSingleExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const expenseId = req.params.expenseId;
    if (!expenseId) {
      throw createError("Expense ID is required", 400);
    }

    const expense = await getSingleExpenseService(expenseId.toString(), userId);

    expense.amount = toCedis(expense.amount);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.params.expenseId) {
      throw createError("Expense ID is required", 400);
    }
    const parsed = updateExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const expense = await updateExpenseService(
      req.params.expenseId.toString(),
      req.user!.id,
      parsed.data.amount ? toPesewas(parsed.data.amount) : undefined,
      parsed.data.description,
      parsed.data.date ? new Date(parsed.data.date) : undefined,
      parsed.data.categoryId,
    );

    expense.amount = toCedis(expense.amount);

    res.status(200).json({
      success: true,
      data: expense,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.params.expenseId) {
      throw createError("Expense ID is required", 400);
    }

    const expense = await deleteExpenseService(
      req.params.expenseId.toString(),
      req.user!.id,
    );

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    next(error);
  }
};

export const monthlyExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = monthlyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;

    const userId = req.user!.id;
    const summary = await monthlyExpenseSummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const dailyExpenseSummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = dailyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;
    const userId = req.user!.id;
    const summary = await dailyExpenseSummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const categoryMonthlySummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = monthlyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;
    const userId = req.user!.id;
    const summary = await categoryMonthlySummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const autoCategorizeExpense = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = autoCategorizeExpenseSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const [userCategories, defaultCategories] = await Promise.all([
      prisma.category.findMany({
        where: { userId: req.user!.id },
      }),
      getDefaultCategoriesCached(),
    ]);

    const categories = [...userCategories, ...defaultCategories];

    const categoryNames = categories.map((c) => c.name);
    const result = await extractExpenseDetails(
      parsed.data.description,
      categoryNames,
    );

    if (!result.amount) {
      throw createError("Could not extract amount from description", 400);
    }

    const category =
      categories.find((c) => c.name === result.category) ||
      categories.find((c) => c.isDefault && c.name === "Other");

    res.status(200).json({
      success: true,
      data: {
        amount: result.amount,
        description: result.description,
        date: result.date,
        category: {
          id: category!.id,
          name: category!.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const aiMonthlySummary = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const parsed = monthlyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;
    const userId = req.user!.id;
    const summary = await aiMonthlySummaryService(userId, month, year);

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const exportDataAsCSV = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const csvData = await exportDataAsCSVService(userId);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="expenses.csv"');
    res.write("\uFEFF"); // Write UTF-8 BOM for Excel compatibility
    res.end(csvData);
  } catch (error) {
    next(error);
  }
};

export const exportDataAsPDF = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.id;
    const parsed = monthlyExpenseSummarySchema.safeParse(req.query);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues
        .map((err: any) => err.message)
        .join(", ");
      throw createError(errorMessages, 400);
    }

    const { month, year } = parsed.data;

    const [summary, categoryBreakdown, dailySummary] = await Promise.all([
      monthlyExpenseSummaryService(userId, month, year),
      categoryMonthlySummaryService(userId, month, year),
      dailyExpenseSummaryService(userId, month, year),
    ]);

    // fetch all expenses for the month with category names
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { category: { select: { name: true } } },
      orderBy: { date: "asc" },
    });

    // group expenses by day key
    const expensesByDay = new Map<string, typeof expenses>();
    for (const expense of expenses) {
      const key = expense.date.toISOString().slice(0, 10);
      if (!expensesByDay.has(key)) expensesByDay.set(key, []);
      expensesByDay.get(key)!.push(expense);
    }

    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
      "default",
      { month: "long" },
    );

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="summary-${year}-${month}.pdf"`,
    );
    doc.pipe(res);

    // ── header ──
    doc.rect(0, 0, doc.page.width, 120).fill("#185FA5");
    doc
      .fontSize(10)
      .fillColor("#85B7EB")
      .text("TRACKWISE", 0, 30, { align: "center" });
    doc
      .fontSize(20)
      .fillColor("#ffffff")
      .text("Expense Summary", 0, 48, { align: "center" });
    doc
      .fontSize(12)
      .fillColor("#B5D4F4")
      .text(`${monthName} ${year}`, 0, 76, { align: "center" });

    let y = 140;

    // ── daily entries ──
    for (const day of dailySummary.dailyTotals) {
      const dayExpenses = expensesByDay.get(day.date) ?? [];

      const date = new Date(day.date);
      const dayLabel = date.toLocaleDateString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });

      // check if we need a new page
      const estimatedHeight = 30 + dayExpenses.length * 44 + 20;
      if (y + estimatedHeight > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }

      // day header
      doc
        .fontSize(11)
        .fillColor("#185FA5")
        .text(dayLabel, 50, y, { width: 400 });
      doc
        .moveTo(50, y + 16)
        .lineTo(545, y + 16)
        .strokeColor("#B5D4F4")
        .lineWidth(0.5)
        .stroke();
      y += 24;

      if (dayExpenses.length === 0) {
        doc.fontSize(10).fillColor("#888780").text("No expenses logged", 50, y);
        y += 20;
      } else {
        for (const expense of dayExpenses) {
          const amount = toCedis(expense.amount);

          // description
          doc
            .fontSize(11)
            .fillColor("#2C2C2A")
            .text(expense.description || "No description", 50, y, {
              width: 280,
            });

          // amount (right aligned)
          doc
            .fontSize(11)
            .fillColor("#2C2C2A")
            .text(`GHS ${amount}`, 330, y, { width: 215, align: "right" });

          y += 16;

          // category (underline row)
          doc
            .fontSize(9)
            .fillColor("#888780")
            .text(expense.category.name, 50, y, { width: 280 });

          // underline
          doc
            .moveTo(50, y + 12)
            .lineTo(545, y + 12)
            .strokeColor("#D3D1C7")
            .lineWidth(0.5)
            .stroke();

          y += 20;
        }

        // day total
        doc
          .fontSize(10)
          .fillColor("#185FA5")
          .text(`Day total: GHS ${day.total}`, 330, y, {
            width: 215,
            align: "right",
          });

        y += 24;
      }
    }

    // ── summary section ──
    if (y + 300 > doc.page.height - 60) {
      doc.addPage();
      y = 50;
    }

    y += 16;
    doc.rect(0, y, doc.page.width, 2).fill("#185FA5");
    y += 16;

    doc.fontSize(14).fillColor("#185FA5").text("Monthly Summary", 50, y);
    y += 24;

    const overviewRows = [
      { label: "Total Spent", value: `GHS ${summary.totalSpent}` },
      { label: "Previous Month", value: `GHS ${summary.previousMonthTotal}` },
      { label: "Transactions", value: `${summary.expenseCount.currentMonth}` },
      {
        label: "Top Category",
        value: `${summary.mostSpentCategory.name} (GHS ${summary.mostSpentCategory.total})`,
      },
    ];

    for (const row of overviewRows) {
      doc.fontSize(11).fillColor("#2C2C2A").text(row.label, 50, y);
      doc
        .fontSize(11)
        .fillColor("#2C2C2A")
        .text(row.value, 330, y, { width: 215, align: "right" });
      doc
        .moveTo(50, y + 14)
        .lineTo(545, y + 14)
        .strokeColor("#D3D1C7")
        .lineWidth(0.5)
        .stroke();
      y += 24;
    }

    y += 12;
    doc.fontSize(14).fillColor("#185FA5").text("By Category", 50, y);
    y += 24;

    const total = summary.totalSpent;

    for (const c of categoryBreakdown.categories) {
      const percentage =
        total > 0 ? ((c.total / total) * 100).toFixed(1) : "0.0";
      const barWidth = total > 0 ? (c.total / total) * 300 : 0;

      doc.fontSize(11).fillColor("#2C2C2A").text(c.categoryName, 50, y);
      doc
        .fontSize(11)
        .fillColor("#2C2C2A")
        .text(`GHS ${c.total}`, 330, y, { width: 150, align: "right" });
      doc
        .fontSize(10)
        .fillColor("#888780")
        .text(`${percentage}%`, 480, y, { width: 65, align: "right" });

      y += 16;

      doc.rect(50, y, 300, 4).fillColor("#F1EFE8").fill();
      doc.rect(50, y, barWidth, 4).fillColor("#185FA5").fill();

      doc
        .moveTo(50, y + 8)
        .lineTo(545, y + 8)
        .strokeColor("#D3D1C7")
        .lineWidth(0.5)
        .stroke();

      y += 20;
    }

    // grand total
    y += 8;
    doc.fontSize(13).fillColor("#2C2C2A").text("Total", 50, y);
    doc
      .fontSize(15)
      .fillColor("#185FA5")
      .text(`GHS ${summary.totalSpent}`, 330, y - 2, {
        width: 215,
        align: "right",
      });

    // footer
    const footerY = doc.page.height - 40;
    doc.rect(0, footerY - 10, doc.page.width, 50).fill("#F1EFE8");
    doc
      .fontSize(9)
      .fillColor("#888780")
      .text(
        `Generated on ${new Date().toISOString().slice(0, 10)}`,
        0,
        footerY,
        { align: "center" },
      );

    doc.end();
  } catch (error) {
    next(error);
  }
};
