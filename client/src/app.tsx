import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import NotFound from './pages/NotFound/NotFound';
import JdListPage from './pages/JdList/JdListPage';
import JdDetailPage from './pages/JdDetail/JdDetailPage';
import JdEditPage from './pages/JdEdit/JdEditPage';
import TermLibraryPage from './pages/TermLibrary/TermLibraryPage';
import TemplateLibraryPage from './pages/TemplateLibrary/TemplateLibraryPage';
import RecruitmentBoardPage from './pages/RecruitmentBoard/RecruitmentBoardPage';
import RecruitmentDetailPage from './pages/RecruitmentDetail/RecruitmentDetailPage';
import OfferOverviewPage from './pages/OfferOverview/OfferOverviewPage';
import ExpenseReportPage from './pages/ExpenseReport/ExpenseReportPage';
import QuestionBankPage from './pages/QuestionBank/QuestionBankPage';
import PositionNameTablePage from './pages/PositionNameTable/PositionNameTablePage';
import CampusSchoolPage from './pages/CampusSchool/CampusSchoolPage';
import FairCalendarPage from './pages/FairCalendar/FairCalendarPage';
import CampusResourcesPage from './pages/CampusResources/CampusResourcesPage';
import ReferralPage from './pages/Referral/ReferralPage';
import OfferTemplatePage from './pages/OfferTemplate/OfferTemplatePage';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RecruitmentBoardPage />} />
        <Route path="board" element={<RecruitmentBoardPage />} />
        <Route path="jd" element={<JdListPage />} />
        <Route path="jd/new" element={<JdEditPage />} />
        <Route path="jd/:id" element={<JdDetailPage />} />
        <Route path="jd/:id/edit" element={<JdEditPage />} />
        <Route path="terms" element={<TermLibraryPage />} />
        <Route path="templates" element={<TemplateLibraryPage />} />
        <Route path="recruitment" element={<RecruitmentBoardPage />} />
        <Route path="recruitment/new" element={<RecruitmentDetailPage />} />
        <Route path="recruitment/:id" element={<RecruitmentDetailPage />} />
        <Route path="offers" element={<OfferOverviewPage />} />
        <Route path="referrals" element={<ReferralPage />} />
        <Route path="expenses" element={<ExpenseReportPage />} />
        <Route path="questions" element={<QuestionBankPage />} />
        <Route path="offer-template" element={<OfferTemplatePage />} />
        <Route path="position-names" element={<PositionNameTablePage />} />
        <Route path="campus/schools" element={<CampusSchoolPage />} />
        <Route path="campus/calendar" element={<FairCalendarPage />} />
        <Route path="campus/resources" element={<CampusResourcesPage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
