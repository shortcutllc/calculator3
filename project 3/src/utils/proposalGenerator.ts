import { v4 as uuidv4 } from 'uuid';
import { Proposal, ProposalData, ProposalCustomization } from '../types/proposal';
import { getProposalUrl } from './url';

export const calculateServiceResults = (service: any) => {
  if (!service.appTime || !service.numPros || !service.totalHours) {
    return { totalAppointments: 0, serviceCost: 0, proRevenue: 0 };
  }

  const apptsPerHourPerPro = 60 / service.appTime;
  const totalApptsPerHour = apptsPerHourPerPro * service.numPros;
  const totalAppts = Math.floor(service.totalHours * totalApptsPerHour);

  let serviceCost = 0;
  let proRevenue = 0;

  if (service.serviceType === 'headshot') {
    proRevenue = service.totalHours * service.numPros * (service.proHourly || 0);
    const retouchingTotal = totalAppts * (service.retouchingCost || 0);
    serviceCost = proRevenue + retouchingTotal;
  } else {
    serviceCost = service.totalHours * (service.hourlyRate || 0) * service.numPros;
    proRevenue = (service.totalHours * service.numPros * (service.proHourly || 0)) + 
                 ((service.earlyArrival || 0) * service.numPros);
  }

  if (service.discountPercent > 0) {
    serviceCost = serviceCost * (1 - (service.discountPercent / 100));
  }

  return {
    totalAppointments: totalAppts,
    serviceCost: Number(serviceCost.toFixed(2)),
    proRevenue: Number(proRevenue.toFixed(2))
  };
};

export const calculateChanges = (original: any, updated: any) => {
  const changes: { [key: string]: any } = {};

  Object.entries(updated.services || {}).forEach(([location, locationData]: [string, any]) => {
    Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
      dateData.services.forEach((service: any, index: number) => {
        const originalService = original.services?.[location]?.[date]?.services?.[index];
        if (originalService) {
          if (service.numPros !== originalService.numPros) {
            changes[`${location}-${date}-${index}-pros`] = {
              original: originalService.numPros,
              updated: service.numPros,
              percentChange: ((service.numPros - originalService.numPros) / originalService.numPros) * 100
            };
          }

          if (service.totalHours !== originalService.totalHours) {
            changes[`${location}-${date}-${index}-hours`] = {
              original: originalService.totalHours,
              updated: service.totalHours,
              percentChange: ((service.totalHours - originalService.totalHours) / originalService.totalHours) * 100
            };
          }

          const updatedResults = calculateServiceResults(service);
          const originalResults = calculateServiceResults(originalService);
          
          if (updatedResults.serviceCost !== originalResults.serviceCost) {
            changes[`${location}-${date}-${index}-cost`] = {
              original: originalResults.serviceCost,
              updated: updatedResults.serviceCost,
              percentChange: Number(((updatedResults.serviceCost - originalResults.serviceCost) / originalResults.serviceCost * 100).toFixed(2))
            };
          }
        }
      });
    });
  });

  return changes;
};

export const generateProposal = (
  data: ProposalData,
  customization: ProposalCustomization
): Proposal => {
  const id = uuidv4();
  const now = new Date().toISOString();
  
  return {
    id,
    createdAt: now,
    updatedAt: now,
    data,
    customization,
    isEditable: true,
    status: 'draft',
    pendingReview: false,
    hasChanges: false,
    originalData: data
  };
};

export const generateShareableLink = (proposalId: string): string => {
  return getProposalUrl(proposalId, true);
};

export const prepareProposalFromCalculation = (currentClient: any): ProposalData => {
  const proposalData: ProposalData = {
    clientName: currentClient.name,
    eventDates: [],
    locations: currentClient.locations,
    services: {},
    summary: {
      totalAppointments: 0,
      totalEventCost: 0,
      totalProRevenue: 0,
      netProfit: 0,
      profitMargin: 0
    }
  };

  // First, collect and sort all unique dates
  const allDates = new Set<string>();
  Object.values(currentClient.events).forEach((locationEvents: any) => {
    locationEvents.forEach((event: any) => {
      event.services.forEach((service: any) => {
        allDates.add(service.date);
      });
    });
  });
  proposalData.eventDates = Array.from(allDates).sort();

  // Process each location
  Object.entries(currentClient.events).forEach(([location, locationEvents]: [string, any]) => {
    proposalData.services[location] = {};
    
    // Group services by date
    const servicesByDate: { [date: string]: any[] } = {};
    locationEvents.forEach((event: any) => {
      event.services.forEach((service: any) => {
        if (!servicesByDate[service.date]) {
          servicesByDate[service.date] = [];
        }
        servicesByDate[service.date].push(service);
      });
    });

    // Sort dates and create day data
    Object.keys(servicesByDate)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .forEach(date => {
        proposalData.services[location][date] = {
          services: servicesByDate[date].map(service => {
            const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(service);
            return {
              ...service,
              totalAppointments,
              serviceCost,
              proRevenue
            };
          }),
          totalCost: 0,
          totalAppointments: 0
        };
      });
  });

  return recalculateServiceTotals(proposalData);
};

export const recalculateServiceTotals = (proposalData: ProposalData): ProposalData => {
  const updatedData = { ...proposalData };
  
  updatedData.summary = {
    totalAppointments: 0,
    totalEventCost: 0,
    totalProRevenue: 0,
    netProfit: 0,
    profitMargin: 0
  };

  // Process each location
  Object.entries(updatedData.services || {}).forEach(([location, dates]) => {
    // Sort dates within each location
    const sortedDates = Object.entries(dates)
      .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
      .reduce((acc, [date, data]) => ({
        ...acc,
        [date]: {
          ...data,
          services: data.services
        }
      }), {});

    updatedData.services[location] = sortedDates;

    // Process each date
    Object.entries(sortedDates).forEach(([date, dayData]) => {
      let dayTotalCost = 0;
      let dayTotalAppointments = 0;
      let dayTotalProRevenue = 0;

      dayData.services.forEach((service: any) => {
        const { totalAppointments, serviceCost, proRevenue } = calculateServiceResults(service);
        
        service.totalAppointments = totalAppointments;
        service.serviceCost = serviceCost;
        
        dayTotalCost += serviceCost;
        dayTotalAppointments += totalAppointments;
        dayTotalProRevenue += proRevenue;
      });

      updatedData.services[location][date].totalCost = Number(dayTotalCost.toFixed(2));
      updatedData.services[location][date].totalAppointments = dayTotalAppointments;
      
      updatedData.summary.totalAppointments += dayTotalAppointments;
      updatedData.summary.totalEventCost += dayTotalCost;
      updatedData.summary.totalProRevenue += dayTotalProRevenue;
    });
  });

  updatedData.summary.netProfit = Number((updatedData.summary.totalEventCost - updatedData.summary.totalProRevenue).toFixed(2));
  updatedData.summary.profitMargin = updatedData.summary.totalEventCost > 0 
    ? Number(((updatedData.summary.netProfit / updatedData.summary.totalEventCost) * 100).toFixed(2))
    : 0;

  return updatedData;
};