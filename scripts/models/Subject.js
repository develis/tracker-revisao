import Revision from './Revision.js';

export default class Subject {
    constructor(id, name, studyDate, successRate, revisions) {
        this.id = id;
        this.name = name;
        this.studyDate = studyDate;
        this.successRate = successRate;
        this.revisions = revisions;
        this.createdAt = new Date().toISOString();
    }

    static createNew(category, subjectName, studyDate, successRate) {
        const firstStudyDate = new Date(studyDate);
        firstStudyDate.setHours(0, 0, 0, 0);
        const revisions = Subject.calculateRevisions(firstStudyDate, successRate);
        const fullName = `${category} - ${subjectName}`;
        return new Subject(Date.now().toString(), fullName, studyDate, successRate, revisions);
    }

    static calculateRevisions(firstStudyDate, initialSuccessRate) {
        const revisions = [];
        const date1 = new Date(firstStudyDate);
        date1.setDate(date1.getDate() + 3);
        revisions.push(new Revision(`r1-${Date.now()}`, 'Revisão 1', date1.toISOString().split('T')[0]));

        const date2 = new Date(date1);
        date2.setDate(date2.getDate() + 7);
        revisions.push(new Revision(`r2-${Date.now()}`, 'Revisão 2', date2.toISOString().split('T')[0]));

        if (initialSuccessRate <= 70) {
            const date3 = new Date(date2);
            date3.setDate(date3.getDate() + 15);
            revisions.push(new Revision(`r3-${Date.now()}`, 'Revisão 3', date3.toISOString().split('T')[0]));
        }
        return revisions;
    }

    addRevision(revisionType) {
        const lastRevision = this.revisions[this.revisions.length - 1];
        if (!lastRevision) return;

        const newDate = new Date(lastRevision.scheduledDate);
        newDate.setDate(newDate.getDate() + 15);
        this.revisions.push(new Revision(`r3-${Date.now()}`, revisionType, newDate.toISOString().split('T')[0]));
    }
}