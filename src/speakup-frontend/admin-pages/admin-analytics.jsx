import React, { useEffect, useMemo, useState, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import AdminSideBar from './components/AdminSideBar';
import AdminNavbar from './components/AdminNavBar';
import { db } from '../../firebase/firebase';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f97316' },
  inProgress: { label: 'In Progress', color: '#3b82f6' },
  resolved: { label: 'Resolved', color: '#16a34a' },
  closed: { label: 'Closed', color: '#6b7280' },
};

const URGENCY_CONFIG = {
  high: { label: 'High', color: '#dc2626' },
  medium: { label: 'Medium', color: '#facc15' },
  low: { label: 'Low', color: '#22c55e' },
};

const normalizeStatus = (status = '') => {
  const value = status.toString().toLowerCase();
  if (value.includes('progress')) return 'inProgress';
  if (value.includes('pending')) return 'pending';
  if (value.includes('resolve')) return 'resolved';
  if (value.includes('close')) return 'closed';
  return 'pending';
};

const normalizeUrgency = (urgency = '') => {
  const value = urgency.toString().toLowerCase();
  if (value.includes('high')) return 'high';
  if (value.includes('medium')) return 'medium';
  if (value.includes('low')) return 'low';
  return null;
};

const normalizeCategory = (category = 'Uncategorized') =>
  category.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || 'Uncategorized';

const toDateValue = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPeriodStart = (date, type) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  switch (type) {
    case 'week': {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      break;
    }
    case 'month':
      start.setDate(1);
      break;
    case 'year':
      start.setMonth(0, 1);
      break;
    default:
      break;
  }
  return start;
};

const formatPeriodLabel = (date, type) => {
  switch (type) {
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
};

const buildTimeSeries = (complaints, type, count) => {
  const template = [];
  const lookup = {};
  for (let i = count - 1; i >= 0; i -= 1) {
    const reference = new Date();
    reference.setHours(0, 0, 0, 0);
    if (type === 'week') {
      reference.setDate(reference.getDate() - i * 7);
    } else if (type === 'month') {
      reference.setMonth(reference.getMonth() - i, 1);
    } else if (type === 'year') {
      reference.setFullYear(reference.getFullYear() - i, 0, 1);
    }
    const start = getPeriodStart(reference, type);
    const key = `${type}:${start.toISOString()}`;
    const bucket = {
      key,
      label: formatPeriodLabel(start, type),
      value: 0,
    };
    template.push(bucket);
    lookup[key] = bucket;
  }
  complaints.forEach((complaint) => {
    const date = toDateValue(complaint.submissionDate);
    if (!date) return;
    const bucketStart = getPeriodStart(date, type);
    const bucketKey = `${type}:${bucketStart.toISOString()}`;
    if (lookup[bucketKey]) {
      lookup[bucketKey].value += 1;
    }
  });
  return template;
};

const sortSeriesDesc = (series) => [...series].sort((a, b) => b.value - a.value);

const TREND_VIEWS = [
  { key: 'week', label: 'Weekly', description: 'Last 6 weeks' },
  { key: 'month', label: 'Monthly', description: 'Last 6 months' },
  { key: 'year', label: 'Yearly', description: 'Last 5 years' },
];

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendRange, setTrendRange] = useState('week');
  const [activeTrendPeriod, setActiveTrendPeriod] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'complaints'));
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setComplaints(docs);
        setError(null);
      } catch (err) {
        console.error('Error loading analytics data:', err);
        setError('Unable to load analytics right now. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchComplaints();
  }, []);

  const statusCounts = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => {
        const key = normalizeStatus(complaint.status);
        acc[key] += 1;
        return acc;
      },
      { pending: 0, inProgress: 0, resolved: 0, closed: 0 }
    );
  }, [complaints]);

  const urgencyCounts = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => {
        const key = normalizeUrgency(complaint.urgency);
        if (key) acc[key] += 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [complaints]);

  const categoryDistribution = useMemo(() => {
    const counts = complaints.reduce((acc, complaint) => {
      const category = normalizeCategory(complaint.category);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [complaints]);

  const weeklyVolume = useMemo(() => {
    const days = [...Array(7)].map((_, idx) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - idx));
      return date;
    });
    const template = days.map((date) => ({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0,
    }));
    const lookup = template.reduce((acc, day) => {
      acc[day.key] = day;
      return acc;
    }, {});
    complaints.forEach((complaint) => {
      const date = toDateValue(complaint.submissionDate);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      if (lookup[key]) {
        lookup[key].value += 1;
      }
    });
    return template;
  }, [complaints]);

  const weeklyTrend = useMemo(() => buildTimeSeries(complaints, 'week', 6), [complaints]);
  const monthlyTrend = useMemo(() => buildTimeSeries(complaints, 'month', 6), [complaints]);
  const yearlyTrend = useMemo(() => buildTimeSeries(complaints, 'year', 5), [complaints]);

  const sortedTrendData = useMemo(
    () => ({
      weekly: sortSeriesDesc(weeklyTrend),
      monthly: sortSeriesDesc(monthlyTrend),
      yearly: sortSeriesDesc(yearlyTrend),
    }),
    [weeklyTrend, monthlyTrend, yearlyTrend]
  );

  const totalComplaints = complaints.length;
  const openComplaints = statusCounts.pending + statusCounts.inProgress;
  const resolvedThisWeek = weeklyVolume.slice(-7).reduce((sum, day) => sum + day.value, 0);
  const avgPerDay = weeklyVolume.length
    ? Math.round(weeklyVolume.reduce((sum, day) => sum + day.value, 0) / weeklyVolume.length)
    : 0;

  const selectedTrendSeries = useMemo(() => {
    switch (trendRange) {
      case 'month':
        return monthlyTrend;
      case 'year':
        return yearlyTrend;
      case 'week':
      default:
        return weeklyTrend;
    }
  }, [trendRange, weeklyTrend, monthlyTrend, yearlyTrend]);

  const selectedTrendSummary = useMemo(() => {
    switch (trendRange) {
      case 'month':
        return sortedTrendData.monthly;
      case 'year':
        return sortedTrendData.yearly;
      case 'week':
      default:
        return sortedTrendData.weekly;
    }
  }, [trendRange, sortedTrendData]);

  const maxStatusValue = Math.max(...Object.values(statusCounts), 1);
  const maxCategoryValue = Math.max(...categoryDistribution.map((category) => category.value), 1);
  const maxUrgencyValue = Math.max(...Object.values(urgencyCounts), 1);
  const maxTrendValue = Math.max(...selectedTrendSeries.map((day) => day.value), 1);
  const totalSelectedTrend = selectedTrendSeries.reduce((sum, period) => sum + period.value, 0);

  useEffect(() => {
    setActiveTrendPeriod(null);
  }, [trendRange, selectedTrendSeries]);

  const focusedTrendPeriod = useMemo(() => {
    if (!selectedTrendSeries.length) return null;
    return (
      selectedTrendSeries.find((period) => period.key === activeTrendPeriod) ||
      selectedTrendSeries[selectedTrendSeries.length - 1]
    );
  }, [activeTrendPeriod, selectedTrendSeries]);

  // Helper function to convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  const generatePDF = async (action = 'download') => {
    if (isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);
    
    try {
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;
      
      // Create PDF document
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header to first page
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor(17, 24, 39); // #111827
      pdf.text('Analytics Report', 105, 20, { align: 'center' });
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128); // #6b7280
      pdf.text(`Generated on ${new Date().toLocaleString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 105, 30, { align: 'center' });
      
      // Add summary stats (Page 1)
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(16);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Summary Statistics', 20, 45);
      
      let yPos = 55;
      
      // Summary cards
      const summaries = [
        { label: 'Total Complaints', value: totalComplaints, subtitle: 'All time' },
        { label: 'Active Queue', value: openComplaints, subtitle: 'Pending + In Progress' },
        { label: 'Weekly Volume', value: resolvedThisWeek, subtitle: 'Submissions (last 7 days)' },
        { label: 'Avg. per Day', value: avgPerDay, subtitle: 'Based on last 7 days' },
      ];
      
      summaries.forEach((item, index) => {
        const xPos = 20 + (index % 2) * 85;
        const yCard = yPos + Math.floor(index / 2) * 30;
        
        pdf.setDrawColor(229, 231, 235); // #e5e7eb
        pdf.setLineWidth(0.5);
        pdf.roundedRect(xPos, yCard, 80, 25, 3, 3);
        
        pdf.setFontSize(10);
        pdf.setTextColor(107, 114, 128);
        pdf.text(item.label, xPos + 40, yCard + 7, { align: 'center' });
        
        pdf.setFontSize(20);
        pdf.setTextColor(220, 38, 38); // #dc2626
        pdf.text(item.value.toString(), xPos + 40, yCard + 15, { align: 'center' });
        
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175); // #9ca3af
        pdf.text(item.subtitle, xPos + 40, yCard + 21, { align: 'center' });
      });
      
      yPos += 70;
      
      // Check if we need a new page
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Status Overview
      pdf.setFontSize(16);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Status Overview', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Workload split across lifecycle stages', 20, yPos);
      yPos += 15;
      
      // Status bars
      const statusEntries = Object.entries(STATUS_CONFIG);
      const barWidth = 30;
      const barSpacing = 20;
      const maxBarHeight = 40;
      
      statusEntries.forEach(([key, config], index) => {
        const xPos = 20 + index * (barWidth + barSpacing);
        const barHeight = Math.max((statusCounts[key] / maxStatusValue) * maxBarHeight, 5);
        
        // Draw bar
        pdf.setFillColor(...hexToRgb(config.color));
        pdf.rect(xPos, yPos + maxBarHeight - barHeight, barWidth, barHeight, 'F');
        
        // Draw value
        pdf.setFontSize(14);
        pdf.setTextColor(17, 24, 39);
        pdf.text(statusCounts[key].toString(), xPos + barWidth/2, yPos + maxBarHeight + 10, { align: 'center' });
        
        // Draw label
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(config.label, xPos + barWidth/2, yPos + maxBarHeight + 16, { align: 'center' });
      });
      
      yPos += 70;
      
      // Check if we need a new page
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Top Categories
      pdf.setFontSize(16);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Top Categories', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Most frequently reported issues', 20, yPos);
      yPos += 15;
      
      categoryDistribution.forEach((category, index) => {
        const barWidth = (category.value / maxCategoryValue) * 150;
        
        // Category label and value
        pdf.setFontSize(11);
        pdf.setTextColor(55, 65, 81); // #374151
        pdf.text(category.label, 20, yPos);
        pdf.setTextColor(17, 24, 39);
        pdf.text(category.value.toString(), 190, yPos, { align: 'right' });
        
        // Progress bar background
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        pdf.rect(20, yPos + 3, 150, 6);
        
        // Progress bar fill
        pdf.setFillColor(220, 38, 38); // #dc2626
        pdf.rect(20, yPos + 3, barWidth, 6, 'F');
        
        yPos += 15;
      });
      
      yPos += 10;
      
      // Check if we need a new page
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Urgency Breakdown
      pdf.setFontSize(16);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Urgency Breakdown', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Priority distribution', 20, yPos);
      yPos += 15;
      
      // Urgency bars
      const urgencyEntries = Object.entries(URGENCY_CONFIG);
      
      urgencyEntries.forEach(([key, config], index) => {
        const xPos = 20 + index * (barWidth + barSpacing);
        const barHeight = Math.max((urgencyCounts[key] / maxUrgencyValue) * maxBarHeight, 5);
        
        // Draw bar
        pdf.setFillColor(...hexToRgb(config.color));
        pdf.rect(xPos, yPos + maxBarHeight - barHeight, barWidth, barHeight, 'F');
        
        // Draw value
        pdf.setFontSize(14);
        pdf.setTextColor(17, 24, 39);
        pdf.text(urgencyCounts[key].toString(), xPos + barWidth/2, yPos + maxBarHeight + 10, { align: 'center' });
        
        // Draw label
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text(config.label, xPos + barWidth/2, yPos + maxBarHeight + 16, { align: 'center' });
      });
      
      yPos += 70;
      
      // Check if we need a new page
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      // Submission Trends
      pdf.setFontSize(16);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Submission Trends', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Historical complaint volume over time (${TREND_VIEWS.find(v => v.key === trendRange)?.label})`, 20, yPos);
      yPos += 15;
      
      // Trend bars
      const trendBarWidth = 15;
      const trendBarSpacing = 10;
      const trendMaxBarHeight = 40;
      
      selectedTrendSeries.forEach((period, index) => {
        const xPos = 20 + index * (trendBarWidth + trendBarSpacing);
        const barHeight = Math.max((period.value / maxTrendValue) * trendMaxBarHeight, 5);
        
        // Draw bar
        pdf.setFillColor(220, 38, 38); // #dc2626
        pdf.rect(xPos, yPos + trendMaxBarHeight - barHeight, trendBarWidth, barHeight, 'F');
        
        // Draw value
        pdf.setFontSize(10);
        pdf.setTextColor(17, 24, 39);
        pdf.text(period.value.toString(), xPos + trendBarWidth/2, yPos + trendMaxBarHeight + 8, { align: 'center' });
        
        // Draw label
        pdf.setFontSize(7);
        pdf.setTextColor(107, 114, 128);
        const lines = pdf.splitTextToSize(period.label, trendBarWidth + 10);
        pdf.text(lines, xPos + trendBarWidth/2, yPos + trendMaxBarHeight + 15, { align: 'center' });
      });
      
      yPos += 65;
      
      // Trend summary if focused period exists
      if (focusedTrendPeriod) {
        if (yPos > 200) {
          pdf.addPage();
          yPos = 20;
        }
        
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        pdf.setFillColor(249, 250, 251); // #f9fafb
        pdf.roundedRect(20, yPos, 170, 30, 3, 3, 'F');
        pdf.roundedRect(20, yPos, 170, 30, 3, 3);
        
        const trendSummaryWidth = 170 / 3;
        
        // Period
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Period', 20 + trendSummaryWidth/2, yPos + 8, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setTextColor(17, 24, 39);
        pdf.text(focusedTrendPeriod.label, 20 + trendSummaryWidth/2, yPos + 16, { align: 'center' });
        
        // Submissions
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text('Submissions', 20 + trendSummaryWidth + trendSummaryWidth/2, yPos + 8, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setTextColor(220, 38, 38); // #dc2626
        pdf.text(focusedTrendPeriod.value.toString(), 20 + trendSummaryWidth + trendSummaryWidth/2, yPos + 16, { align: 'center' });
        
        // % of Total
        pdf.setFontSize(9);
        pdf.setTextColor(107, 114, 128);
        pdf.text('% of Total', 20 + 2*trendSummaryWidth + trendSummaryWidth/2, yPos + 8, { align: 'center' });
        pdf.setFontSize(14);
        pdf.setTextColor(17, 24, 39);
        const percentage = totalSelectedTrend > 0 ? Math.round((focusedTrendPeriod.value / totalSelectedTrend) * 100) : 0;
        pdf.text(`${percentage}%`, 20 + 2*trendSummaryWidth + trendSummaryWidth/2, yPos + 16, { align: 'center' });
        
        yPos += 40;
      }
      
      // Trend Summary
      if (yPos > 220) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFontSize(14);
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${TREND_VIEWS.find(v => v.key === trendRange)?.label} Summary`, 20, yPos);
      yPos += 10;
      
      selectedTrendSummary.slice(0, 3).forEach((period, idx) => {
        // Rank circle
        const rankColors = ['#f59e0b', '#9ca3af', '#ea580c'];
        pdf.setFillColor(...hexToRgb(rankColors[idx]));
        pdf.circle(25, yPos + 4, 4, 'F');
        
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.text((idx + 1).toString(), 25, yPos + 6, { align: 'center' });
        
        // Period label
        pdf.setFontSize(10);
        pdf.setTextColor(55, 65, 81);
        pdf.text(period.label, 35, yPos + 6);
        
        // Period value
        pdf.setFontSize(12);
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${period.value} complaints`, 190, yPos + 6, { align: 'right' });
        
        yPos += 15;
      });
      
      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Page ${i} of ${pageCount}`, 105, 287, { align: 'center' });
      }
      
      // Save or open the PDF based on action
      const fileName = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      
      if (action === 'download') {
        pdf.save(fileName);
      } else if (action === 'print') {
        // For printing, we need to convert PDF to blob and open in new window
        const pdfBlob = pdf.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(pdfUrl, '_blank');
        
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
            // Clean up after printing
            setTimeout(() => {
              printWindow.close();
              URL.revokeObjectURL(pdfUrl);
            }, 1000);
          };
        } else {
          // Fallback to download if window.open fails
          pdf.save(fileName);
        }
      }
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Error generating PDF. Please try again. Make sure jspdf is installed.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleDownload = () => {
    generatePDF('download');
  };

  const handlePrint = () => {
    generatePDF('print');
  };

  return (
    <div className="flex min-h-screen bg-gray-50" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <AdminSideBar />
      
      <main className="flex-1 lg:ml-0">
        <AdminNavbar />
        
        <div className="p-4 md:p-6 lg:p-8 xl:p-10 pt-24 ml-6 mt-[100px] lg:pt-32 w-full max-w-[1200px] min-h-screen">
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
            
            @media print {
              body * {
                visibility: hidden;
              }
              .no-print, .no-print * {
                display: none !important;
              }
            }
            
            @media (max-width: 768px) {
              .header-buttons {
                flex-direction: column;
                gap: 12px;
                width: 100%;
                margin-top: 16px;
              }
              .header-buttons button {
                width: 100%;
              }
              .trend-buttons {
                overflow-x: auto;
                padding-bottom: 10px;
                gap: 8px;
              }
              .trend-buttons button {
                white-space: nowrap;
                flex-shrink: 0;
              }
            }
            
            @media (max-width: 640px) {
              .summary-grid {
                grid-template-columns: 1fr !important;
              }
              .charts-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>

          {/* Header - Redesigned */}
          <header className="mb-8 md:mb-5 lg:mb-8 no-print">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2">
                <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-2xl">
                  Analysis of complaint activity and platform performance metrics.
                </p>
              </div>
              
              {/* Redesigned Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 lg:ml-4">
                <button
                  onClick={handlePrint}
                  disabled={isGeneratingPDF}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 
                    font-medium text-sm rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 
                        12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 
                        2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      <span>Print</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isGeneratingPDF}
                  className={`flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8B0000] text-white font-medium text-sm 
                    rounded-lg hover:bg-maroon-400 transition-all duration-200 shadow-sm hover:shadow ${isGeneratingPDF ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingPDF ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 
                        12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </header>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm font-medium no-print">
              {error}
            </div>
          )}

          {/* Main content for web view */}
          <div className="no-print">
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
              {[
                { label: 'Total Complaints', value: totalComplaints, subtitle: 'All time' },
                { label: 'Active Queue', value: openComplaints, subtitle: 'Pending + In Progress' },
                { label: 'Weekly Volume', value: resolvedThisWeek, subtitle: 'Submissions (last 7 days)' },
                { label: 'Avg. per Day', value: avgPerDay, subtitle: 'Based on the last 7 days' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 md:p-8 transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-700 to-orange-600"></div>
                  <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4 font-semibold uppercase tracking-wide">{item.label}</p>
                  <h3 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-br from-red-800 to-orange-600 bg-clip-text text-transparent mb-2">
                    {isLoading ? '...' : item.value}
                  </h3>
                  <span className="text-xs text-gray-400 font-medium">{item.subtitle}</span>
                </div>
              ))}
            </section>

            <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 mb-6 md:mb-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <header className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
                <div>
                  <h2 className="text-2xl md:text-2xl font-bold text-gray-900 mb-2">Status Overview</h2>
                  <p className="text-gray-500 text-sm font-medium">Workload split across lifecycle stages</p>
                </div>
              </header>
              <div className="flex items-end justify-around h-64 md:h-80 gap-4 md:gap-8 p-4 md:p-8 bg-gradient-to-b from-gray-50 to-white rounded-xl">
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <div key={key} className="flex-1 flex flex-col items-center h-full max-w-24 md:max-w-36">
                    <div
                      className="w-full max-w-16 md:max-w-24 rounded-t-xl transition-all duration-500 min-h-2 relative shadow-lg hover:shadow-xl hover:-translate-y-2 hover:scale-105"
                      style={{
                        height: `${(statusCounts[key] / maxStatusValue) * 100}%`,
                        background: config.color,
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl"></div>
                    </div>
                    <p className="mt-4 md:mt-6 text-2xl md:text-3xl font-extrabold text-gray-900">{statusCounts[key]}</p>
                    <p className="mt-1 md:mt-2 text-xs md:text-sm font-semibold text-gray-600">{config.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8 charts-grid">
              <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <header className="mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
                  <h2 className="text-2xl md:text-2xl font-bold text-gray-900 mb-2">Top Categories</h2>
                  <p className="text-gray-500 text-sm font-medium">Most frequently reported issues</p>
                </header>
                <div className="space-y-4">
                  {categoryDistribution.map((category, idx) => (
                    <div key={idx} className="group">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold text-gray-700 truncate pr-2">{category.label}</span>
                        <span className="text-lg font-bold text-gray-900 whitespace-nowrap">{category.value}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-red-700 to-orange-600 rounded-full transition-all duration-700 group-hover:from-red-600 group-hover:to-orange-500"
                          style={{ width: `${(category.value / maxCategoryValue) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 shadow-lg hover:shadow-xl transition-shadow duration-300">
                <header className="mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
                  <h2 className="text-2xl md:text-2xl font-bold text-gray-900 mb-2">Urgency Breakdown</h2>
                  <p className="text-gray-500 text-sm font-medium">Priority distribution</p>
                </header>
                <div className="flex items-end justify-around h-64 gap-4 md:gap-8 p-4 md:p-8 bg-gradient-to-b from-gray-50 to-white rounded-xl">
                  {Object.entries(URGENCY_CONFIG).map(([key, config]) => (
                    <div key={key} className="flex-1 flex flex-col items-center h-full max-w-24 md:max-w-32">
                      <div
                        className="w-full max-w-14 md:max-w-20 rounded-t-xl transition-all duration-500 min-h-2 relative shadow-lg hover:shadow-xl hover:-translate-y-2 hover:scale-105"
                        style={{
                          height: `${(urgencyCounts[key] / maxUrgencyValue) * 100}%`,
                          background: config.color,
                        }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl"></div>
                      </div>
                      <p className="mt-4 md:mt-6 text-2xl md:text-3xl font-extrabold text-gray-900">{urgencyCounts[key]}</p>
                      <p className="mt-1 md:mt-2 text-xs md:text-sm font-semibold text-gray-600">{config.label}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="bg-white rounded-2xl p-6 md:p-8 lg:p-10 mb-8 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <header className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6 md:mb-8 pb-6 border-b-2 border-gray-100">
                <div>
                  <h2 className="text-2xl md:text-1xl font-bold text-gray-900 mb-2">Submission Trends</h2>
                  <p className="text-gray-500 text-sm font-medium">
                    Historical complaint volume over time
                  </p>
                </div>
                <div className="flex gap-2 no-print trend-buttons">
                  {TREND_VIEWS.map((view) => (
                    <button
                      key={view.key}
                      onClick={() => setTrendRange(view.key)}
                      className={`px-3 md:px-4 py-2 rounded-lg font-semibold text-xs md:text-sm transition-all duration-300 ${
                        trendRange === view.key
                          ? 'bg-gradient-to-br from-red-700 to-orange-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {view.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="flex items-end justify-around h-64 md:h-80 gap-3 md:gap-4 p-4 md:p-8 bg-gradient-to-b from-gray-50 to-white rounded-xl mb-6">
                {selectedTrendSeries.map((period) => (
                  <div
                    key={period.key}
                    className="flex-1 flex flex-col items-center h-full cursor-pointer group"
                    onClick={() => setActiveTrendPeriod(period.key)}
                  >
                    <div
                      className={`w-full rounded-t-xl transition-all duration-500 min-h-2 relative ${
                        activeTrendPeriod === period.key
                          ? 'bg-gradient-to-t from-red-700 to-orange-500 shadow-xl scale-105'
                          : 'bg-gradient-to-t from-red-600 to-orange-600 shadow-lg group-hover:shadow-xl group-hover:-translate-y-2'
                      }`}
                      style={{
                        height: `${(period.value / maxTrendValue) * 100}%`,
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-white/30 to-transparent rounded-t-xl"></div>
                    </div>
                    <p className={`mt-3 md:mt-4 text-xl md:text-2xl font-extrabold transition-colors ${
                      activeTrendPeriod === period.key ? 'text-red-700' : 'text-gray-900'
                    }`}>
                      {period.value}
                    </p>
                    <p className="mt-1 md:mt-2 text-xs font-semibold text-gray-500 text-center leading-tight">{period.label}</p>
                  </div>
                ))}
              </div>

              {focusedTrendPeriod && (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 md:p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Period</p>
                      <h4 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{focusedTrendPeriod.label}</h4>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">Submissions</p>
                      <h4 className="text-xl md:text-2xl font-bold text-red-700">{focusedTrendPeriod.value}</h4>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-semibold">% of Total</p>
                      <h4 className="text-xl md:text-2xl font-bold text-gray-900">
                        {totalSelectedTrend > 0
                          ? Math.round((focusedTrendPeriod.value / totalSelectedTrend) * 100)
                          : 0}%
                      </h4>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3 md:mb-4">
                  {TREND_VIEWS.find((v) => v.key === trendRange)?.label} Summary
                </h3>
                <div className="space-y-3">
                  {selectedTrendSummary.slice(0, 3).map((period, idx) => (
                    <div key={period.key} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs md:text-sm ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-orange-600'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-700 truncate">{period.label}</span>
                      </div>
                      <span className="text-base md:text-lg font-bold text-gray-900 whitespace-nowrap">{period.value} complaints</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalytics;