import {describe,expect,it} from "vitest";
import {buildCommunityReport,trend} from "./communityReportModel";

describe("community reports",()=>{
  it("aggregates source modules without duplicating operational records",()=>{
    const report=buildCommunityReport({community:{id:"c1"},units:[{status:"rented"},{status:"available"}],charges:[{amount:1000,status:"paid",createdAt:"2026-08-10",paidAt:"2026-08-11"}],services:[{amount:500,status:"incident",anomaly:true}],tickets:[{status:"open",priority:"high",createdAt:"2026-08-25",updatedAt:"2026-08-25"}]},"month");
    expect(report.units).toMatchObject({total:2,occupied:1,occupancy:50});
    expect(report.finance).toMatchObject({billed:1000,collected:1000,collectionRate:100});
    expect(report.utilities).toMatchObject({amount:500,anomalies:1});
    expect(report.maintenance).toMatchObject({active:1,urgent:1});
  });
  it("filters activity by selected period",()=>expect(buildCommunityReport({announcements:[{publishedAt:"2026-08-01",readCount:9},{publishedAt:"2026-08-26",readCount:3}]},"day").community.reads).toBe(3));
  it("calculates period comparison",()=>expect(trend(120,100)).toBe(20));
});
