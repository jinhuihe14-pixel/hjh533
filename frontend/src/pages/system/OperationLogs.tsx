import { useState, useEffect } from 'react';
import { Table, Card, Button, Input, Select, Tag, Space, message } from 'antd';
import { SearchOutlined, ReloadOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import { logApi } from '../../services/api';
import { formatDateTime } from '../../utils/format';

const { Option } = Select;

const OperationLogs = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [module, setModule] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [modules, setModules] = useState<string[]>([]);

  useEffect(() => {
    loadModules();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, pageSize, module, keyword]);

  const loadModules = async () => {
    try {
      const data = await logApi.getModules();
      setModules(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (module) params.module = module;
      if (keyword) params.keyword = keyword;
      
      const data = await logApi.getLogs(params);
      setLogs(data.records);
      setTotal(data.total);
    } catch (e) {
      console.error(e);
      message.error('加载操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  const getModuleColor = (module: string) => {
    const colorMap: Record<string, string> = {
      order: 'blue',
      payment: 'orange',
      invoice: 'purple',
      logistics: 'cyan',
      supplier: 'green',
      system: 'default',
      auth: 'red'
    };
    return colorMap[module] || 'default';
  };

  const getModuleLabel = (module: string) => {
    const labelMap: Record<string, string> = {
      order: '订单模块',
      payment: '财务模块',
      invoice: '票据模块',
      logistics: '物流模块',
      supplier: '供应商模块',
      system: '系统模块',
      auth: '认证模块'
    };
    return labelMap[module] || module;
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('创建')) return 'green';
    if (action.includes('update') || action.includes('修改') || action.includes('更新')) return 'blue';
    if (action.includes('delete') || action.includes('删除')) return 'red';
    if (action.includes('login') || action.includes('登录')) return 'purple';
    return 'default';
  };

  const columns = [
    {
      title: '操作时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (val: string) => formatDateTime(val)
    },
    {
      title: '操作模块',
      dataIndex: 'module',
      key: 'module',
      width: 120,
      render: (val: string) => (
        <Tag color={getModuleColor(val)}>{getModuleLabel(val)}</Tag>
      )
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (val: string) => (
        <Tag color={getActionColor(val)}>{val}</Tag>
      )
    },
    {
      title: '操作人',
      dataIndex: 'operatorName',
      key: 'operatorName',
      width: 120,
      render: (val: string, record: any) => (
        <Space>
          <UserOutlined />
          {val || record.operatorId}
        </Space>
      )
    },
    {
      title: '操作描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '关联ID',
      dataIndex: 'relatedId',
      key: 'relatedId',
      width: 180,
      render: (val: string) => val || '-'
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      key: 'ip',
      width: 130,
      render: (val: string) => val || '-'
    }
  ];

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">操作日志</h2>
      </div>

      <div className="page-content">
        <Card className="card-shadow">
          <Space style={{ marginBottom: 16 }} size="large">
            <Input
              placeholder="搜索操作描述/操作人"
              prefix={<SearchOutlined />}
              style={{ width: 280 }}
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              allowClear
            />
            <Select
              placeholder="操作模块"
              style={{ width: 150 }}
              value={module || undefined}
              onChange={val => setModule(val || '')}
              allowClear
            >
              {modules.map(m => (
                <Option key={m} value={m}>{getModuleLabel(m)}</Option>
              ))}
            </Select>
            <Button icon={<ReloadOutlined />} onClick={loadLogs}>刷新</Button>
          </Space>

          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }
            }}
          />
        </Card>
      </div>
    </div>
  );
};

export default OperationLogs;
