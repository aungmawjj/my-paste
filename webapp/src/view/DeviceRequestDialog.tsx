import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay, Text } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { useStream } from "../model/stream";

function DeviceRequestDialog() {
  const { deviceRequest, approveDeviceRequest, unsetDeviceRequest } = useStream();
  const [approving, setApproving] = useState(false);

  const handleApprove = useCallback(() => {
    setApproving(true);
    approveDeviceRequest?.()
      .catch(console.warn)
      .finally(() => setApproving(false));
  }, [approveDeviceRequest, setApproving]);

  const handleClose = unsetDeviceRequest;

  return (
    <Modal isOpen={!!deviceRequest} onClose={handleClose} autoFocus={false} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent mx={4} _dark={{ bg: "gray.800" }}>
        <ModalHeader>Device Request</ModalHeader>
        <ModalBody>
          <Text>{deviceRequest?.Description}</Text>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" colorScheme="red" mr={3} onClick={handleClose}>
            Reject
          </Button>
          <Button
            variant="outline"
            colorScheme="green"
            onClick={handleApprove}
            isLoading={approving}
            loadingText="Approving"
          >
            {"Yes, it's me!"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default DeviceRequestDialog;
