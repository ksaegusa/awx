import React from 'react';
import { act } from 'react-dom/test-utils';
import { Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';

import { InstancesAPI, InstanceGroupsAPI } from 'api';
import {
  mountWithContexts,
  waitForElement,
} from '../../../../testUtils/enzymeHelpers';

import InstanceList from './InstanceList';

jest.mock('../../../api');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    id: 1,
    instanceGroupId: 2,
  }),
}));

const instances = [
  {
    id: 1,
    type: 'instance',
    url: '/api/v2/instances/1/',
    related: {
      jobs: '/api/v2/instances/1/jobs/',
      instance_groups: '/api/v2/instances/1/instance_groups/',
    },
    uuid: '00000000-0000-0000-0000-000000000000',
    hostname: 'awx',
    created: '2020-07-14T19:03:49.000054Z',
    modified: '2020-08-12T20:08:02.836748Z',
    capacity_adjustment: '0.40',
    version: '13.0.0',
    capacity: 10,
    consumed_capacity: 0,
    percent_capacity_remaining: 60.0,
    jobs_running: 0,
    jobs_total: 68,
    cpu: 6,
    node_type: 'control',
    node_state: 'ready',
    memory: 2087469056,
    cpu_capacity: 24,
    mem_capacity: 1,
    enabled: true,
    managed_by_policy: true,
  },
  {
    id: 2,
    type: 'instance',
    url: '/api/v2/instances/2/',
    related: {
      jobs: '/api/v2/instances/2/jobs/',
      instance_groups: '/api/v2/instances/2/instance_groups/',
    },
    uuid: '00000000-0000-0000-0000-000000000000',
    hostname: 'foo',
    created: '2020-07-14T19:03:49.000054Z',
    modified: '2020-08-12T20:08:02.836748Z',
    capacity_adjustment: '0.40',
    version: '13.0.0',
    capacity: 10,
    consumed_capacity: 0,
    percent_capacity_remaining: 60.0,
    jobs_running: 0,
    jobs_total: 68,
    cpu: 6,
    node_type: 'hybrid',
    node_state: 'ready',
    memory: 2087469056,
    cpu_capacity: 24,
    mem_capacity: 1,
    enabled: true,
    managed_by_policy: false,
  },
  {
    id: 3,
    type: 'instance',
    url: '/api/v2/instances/3/',
    related: {
      jobs: '/api/v2/instances/3/jobs/',
      instance_groups: '/api/v2/instances/3/instance_groups/',
    },
    uuid: '00000000-0000-0000-0000-000000000000',
    hostname: 'bar',
    created: '2020-07-14T19:03:49.000054Z',
    modified: '2020-08-12T20:08:02.836748Z',
    capacity_adjustment: '0.40',
    version: '13.0.0',
    capacity: 10,
    consumed_capacity: 0,
    percent_capacity_remaining: 60.0,
    jobs_running: 0,
    jobs_total: 68,
    cpu: 6,
    node_type: 'execution',
    node_state: 'ready',
    memory: 2087469056,
    cpu_capacity: 24,
    mem_capacity: 1,
    enabled: false,
    managed_by_policy: true,
  },
];

const options = { data: { actions: { POST: true } } };

describe('<InstanceList/>', () => {
  let wrapper;

  beforeEach(async () => {
    InstanceGroupsAPI.readInstances.mockResolvedValue({
      data: {
        count: instances.length,
        results: instances,
      },
    });
    InstanceGroupsAPI.readInstanceOptions.mockResolvedValue(options);
    const history = createMemoryHistory({
      initialEntries: ['/instance_groups/1/instances'],
    });
    await act(async () => {
      wrapper = mountWithContexts(
        <Route path="/instance_groups/:id/instances">
          <InstanceList instanceGroup={{ name: 'Alex' }} />
        </Route>,
        {
          context: {
            router: { history, route: { location: history.location } },
          },
        }
      );
    });
    await waitForElement(wrapper, 'ContentLoading', (el) => el.length === 0);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should have data fetched', () => {
    expect(wrapper.find('InstanceList').length).toBe(1);
  });

  test('should fetch instances from the api and render them in the list', () => {
    expect(InstanceGroupsAPI.readInstances).toHaveBeenCalled();
    expect(InstanceGroupsAPI.readInstanceOptions).toHaveBeenCalled();
    expect(wrapper.find('InstanceListItem').length).toBe(3);
  });

  test('should show associate group modal when adding an existing group', () => {
    wrapper.find('ToolbarAddButton').simulate('click');
    expect(wrapper.find('AssociateModal').length).toBe(1);
    wrapper.find('ModalBoxCloseButton').simulate('click');
    expect(wrapper.find('AssociateModal').length).toBe(0);
  });
  test('should run health check', async () => {
    expect(
      wrapper.find('Button[ouiaId="health-check"]').prop('isDisabled')
    ).toBe(true);
    await act(async () =>
      wrapper.find('DataListToolbar').prop('onSelectAll')(instances)
    );
    wrapper.update();
    expect(
      wrapper.find('Button[ouiaId="health-check"]').prop('isDisabled')
    ).toBe(false);
    await act(async () =>
      wrapper.find('Button[ouiaId="health-check"]').prop('onClick')()
    );
    expect(InstancesAPI.healthCheck).toBeCalledTimes(3);
  });
  test('should render health check error', async () => {
    InstancesAPI.healthCheck.mockRejectedValue(
      new Error({
        response: {
          config: {
            method: 'create',
            url: '/api/v2/instances',
          },
          data: 'An error occurred',
          status: 403,
        },
      })
    );
    expect(
      wrapper.find('Button[ouiaId="health-check"]').prop('isDisabled')
    ).toBe(true);
    await act(async () =>
      wrapper.find('DataListToolbar').prop('onSelectAll')(instances)
    );
    wrapper.update();
    expect(
      wrapper.find('Button[ouiaId="health-check"]').prop('isDisabled')
    ).toBe(false);
    await act(async () =>
      wrapper.find('Button[ouiaId="health-check"]').prop('onClick')()
    );
    wrapper.update();
    expect(wrapper.find('AlertModal')).toHaveLength(1);
  });

  test('should disable disassociate button', async () => {
    expect(
      wrapper.find('Button[ouiaId="disassociate-button"]').prop('isDisabled')
    ).toBe(true);
    await act(async () =>
      wrapper.find('DataListToolbar').prop('onSelectAll')(instances)
    );

    wrapper.update();
    expect(
      wrapper.find('Button[ouiaId="disassociate-button"]').prop('isDisabled')
    ).toBe(true);
    await act(async () =>
      wrapper
        .find('Tr#instance-row-1')
        .find('SelectColumn[aria-label="Select row 0"]')
        .prop('onSelect')(false)
    );

    wrapper.update();
    expect(
      wrapper.find('Button[ouiaId="disassociate-button"]').prop('isDisabled')
    ).toBe(false);
  });
});
